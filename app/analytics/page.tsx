// "use client";

// import { useEffect, useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { Card } from "@/components/ui/card";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Bar,
//   BarChart,
//   CartesianGrid,
//   Legend,
//   Line,
//   LineChart,
//   ResponsiveContainer,
//   Tooltip,
//   XAxis,
//   YAxis,
// } from "recharts";
// import ExportButton from "@/components/export-button";
// import { TrendingUp, Calendar, Package, Activity } from "lucide-react";

// type DepotRow = {
//   id: number;
//   name: string;
//   capacity_teu: number | null;
// };

// type ContainerRow = {
//   id: number;
//   created_at: string;
//   teu_size: number | string;
//   depot_id: number | null;
// };

// interface MonthlyData {
//   month: string;
//   [key: string]: number | string;
// }

// interface DepotStats {
//   depot_name: string;
//   total_containers: number;
//   total_teu: number;
//   avg_utilization: number;
// }

// const months = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];

// const toNumber = (v: number | string | null | undefined) => {
//   const n = typeof v === "string" ? Number(v) : (v ?? 0);
//   return Number.isFinite(n) ? n : 0;
// };

// const formatSupabaseError = (e: unknown) => {
//   if (!e) return "Unknown error (empty)";
//   if (e instanceof Error) return e.message;
//   if (typeof e === "object") {
//     const anyE = e as any;
//     return (
//       anyE?.message ??
//       anyE?.error_description ??
//       anyE?.details ??
//       JSON.stringify(e)
//     );
//   }
//   return String(e);
// };

// export default function AnalyticsPage() {
//   const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
//   const [depotStats, setDepotStats] = useState<DepotStats[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [selectedYear, setSelectedYear] = useState<string>(
//     new Date().getFullYear().toString(),
//   );

//   const [depots, setDepots] = useState<DepotRow[]>([]);

//   useEffect(() => {
//     fetchAnalyticsData();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedYear]);

//   async function fetchAnalyticsData() {
//     try {
//       setLoading(true);
//       const supabase = createClient();

//       // 1) Fetch depots
//       const { data: depotsDataRaw, error: depotsError } = await supabase
//         .from("depots")
//         .select("id, name, capacity_teu")
//         .order("name");

//       if (depotsError) {
//         console.error("depotsError:", depotsError);
//         throw new Error(`Depots query failed: ${depotsError.message}`);
//       }

//       const depotsData = (depotsDataRaw ?? []) as DepotRow[];
//       setDepots(depotsData);

//       // Map depot_id -> depot
//       const depotById = new Map<number, DepotRow>();
//       depotsData.forEach((d) => depotById.set(d.id, d));

//       // 2) Fetch containers (TANPA join)
//       const { data: containersDataRaw, error: containersError } = await supabase
//         .from("containers")
//         .select("id, created_at, teu_size, depot_id")
//         .order("created_at");

//       if (containersError) {
//         console.error("containersError:", containersError);
//         throw new Error(`Containers query failed: ${containersError.message}`);
//       }

//       const containersData = (containersDataRaw ?? []) as ContainerRow[];

//       // ===== Monthly Map =====
//       const monthlyMap: Record<string, MonthlyData> = {};

//       // init 12 bulan untuk tahun terpilih
//       months.forEach((m, index) => {
//         const key = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
//         monthlyMap[key] = { month: `${m.slice(0, 3)} ${selectedYear}` };
//         depotsData.forEach((depot) => {
//           monthlyMap[key][depot.name] = 0;
//         });
//       });

//       // agregasi per bulan & depot
//       containersData.forEach((container) => {
//         const date = new Date(container.created_at);
//         if (date.getFullYear().toString() !== selectedYear) return;

//         const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
//         if (!monthlyMap[yearMonth]) return;

//         const depotName =
//           (container.depot_id
//             ? depotById.get(container.depot_id)?.name
//             : null) ?? "Unknown";

//         const current = monthlyMap[yearMonth][depotName];
//         const currentNum = typeof current === "number" ? current : 0;

//         monthlyMap[yearMonth][depotName] =
//           currentNum + toNumber(container.teu_size);
//       });

//       setMonthlyData(Object.values(monthlyMap));

//       // ===== Stats Map =====
//       const statsMap: Record<
//         string,
//         { total_containers: number; total_teu: number; capacity: number }
//       > = {};

//       depotsData.forEach((depot) => {
//         statsMap[depot.name] = {
//           total_containers: 0,
//           total_teu: 0,
//           capacity: toNumber(depot.capacity_teu),
//         };
//       });

//       containersData.forEach((container) => {
//         const depotName =
//           (container.depot_id
//             ? depotById.get(container.depot_id)?.name
//             : null) ?? "Unknown";

//         // kalau ada depot Unknown, tetap dihitung biar ketahuan datanya “nyangkut”
//         if (!statsMap[depotName]) {
//           statsMap[depotName] = {
//             total_containers: 0,
//             total_teu: 0,
//             capacity: 0,
//           };
//         }

//         statsMap[depotName].total_containers += 1;
//         statsMap[depotName].total_teu += toNumber(container.teu_size);
//       });

//       const statsArray: DepotStats[] = Object.entries(statsMap).map(
//         ([depot_name, stats]) => {
//           const utilization =
//             stats.capacity > 0 ? (stats.total_teu / stats.capacity) * 100 : 0;

//           return {
//             depot_name,
//             total_containers: stats.total_containers,
//             total_teu: stats.total_teu,
//             avg_utilization: Number.isFinite(utilization) ? utilization : 0,
//           };
//         },
//       );

//       setDepotStats(statsArray);
//     } catch (err) {
//       console.error("Error fetching analytics (raw):", err);
//       console.error(
//         "Error fetching analytics (readable):",
//         formatSupabaseError(err),
//       );
//     } finally {
//       setLoading(false);
//     }
//   }

//   const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

//   const currentYear = new Date().getFullYear();
//   const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

//   // Prepare export data
//   const exportData = monthlyData.map((item) => {
//     const row: Record<string, string | number> = { Month: item.month };
//     depots.forEach((depot) => {
//       row[`${depot.name} (TEU)`] =
//         typeof item[depot.name] === "number" ? item[depot.name] : 0;
//     });
//     return row;
//   });

//   if (loading) {
//     return (
//       <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
//         <div className="max-w-7xl mx-auto">
//           <div className="text-center py-8 text-muted-foreground">
//             Loading analytics...
//           </div>
//         </div>
//       </main>
//     );
//   }

//   return (
//     <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
//       <div className="max-w-7xl mx-auto space-y-6">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-8">
//           <div>
//             <h1 className="text-4xl font-bold text-foreground mb-2">
//               Analytics Dashboard
//             </h1>
//             <p className="text-muted-foreground">
//               Monitor depot usage trends and performance metrics
//             </p>
//           </div>
//           <ExportButton
//             data={exportData}
//             filename={`depot-analytics-${selectedYear}`}
//           />
//         </div>

//         {/* Year Selector */}
//         <Card className="p-6">
//           <div className="flex items-center gap-4">
//             <Calendar className="h-5 w-5 text-muted-foreground" />
//             <span className="font-medium">Select Year:</span>
//             <Select value={selectedYear} onValueChange={setSelectedYear}>
//               <SelectTrigger className="w-32">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 {years.map((year) => (
//                   <SelectItem key={year} value={year.toString()}>
//                     {year}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         </Card>

//         {/* Monthly Trend Chart */}
//         <Card className="p-6">
//           <div className="flex items-center gap-2 mb-6">
//             <TrendingUp className="h-5 w-5 text-blue-600" />
//             <h2 className="text-xl font-semibold">Monthly Usage Trend (TEU)</h2>
//           </div>
//           <ResponsiveContainer width="100%" height={400}>
//             <LineChart data={monthlyData}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="month" />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               {depots.map((depot, index) => (
//                 <Line
//                   key={depot.name}
//                   type="monotone"
//                   dataKey={depot.name}
//                   stroke={colors[index % colors.length]}
//                   strokeWidth={2}
//                   dot={{ r: 4 }}
//                   activeDot={{ r: 6 }}
//                 />
//               ))}
//             </LineChart>
//           </ResponsiveContainer>
//         </Card>

//         {/* Depot Comparison Bar Chart */}
//         <Card className="p-6">
//           <div className="flex items-center gap-2 mb-6">
//             <Activity className="h-5 w-5 text-green-600" />
//             <h2 className="text-xl font-semibold">Depot Comparison</h2>
//           </div>
//           <ResponsiveContainer width="100%" height={350}>
//             <BarChart data={depotStats}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="depot_name" />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               <Bar dataKey="total_teu" fill="#3b82f6" name="Total TEU" />
//               <Bar
//                 dataKey="avg_utilization"
//                 fill="#10b981"
//                 name="Utilization %"
//               />
//             </BarChart>
//           </ResponsiveContainer>
//         </Card>

//         {/* Depot Statistics Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//           {depotStats.map((stat) => (
//             <Card key={stat.depot_name} className="p-6">
//               <div className="flex items-center gap-3 mb-4">
//                 <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
//                   <Package className="h-6 w-6 text-blue-600" />
//                 </div>
//                 <h3 className="font-semibold text-foreground">
//                   {stat.depot_name}
//                 </h3>
//               </div>
//               <div className="space-y-3">
//                 <div>
//                   <p className="text-xs text-muted-foreground">
//                     Total Containers
//                   </p>
//                   <p className="text-2xl font-bold">{stat.total_containers}</p>
//                 </div>
//                 <div>
//                   <p className="text-xs text-muted-foreground">Total TEU</p>
//                   <p className="text-xl font-semibold text-blue-600">
//                     {stat.total_teu.toFixed(1)}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-xs text-muted-foreground">Utilization</p>
//                   <p className="text-xl font-semibold text-green-600">
//                     {stat.avg_utilization.toFixed(1)}%
//                   </p>
//                 </div>
//               </div>
//             </Card>
//           ))}
//         </div>
//       </div>
//     </main>
//   );
// }

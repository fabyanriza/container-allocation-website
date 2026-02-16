"use client"

import { type ComponentType, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, MapPin, Package, Zap } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface KPIData {
  total_containers: number
  total_teu: number
  avg_utilization: number
  depots_critical: number
  depots_warning: number
  empty_containers: number
  full_containers: number
  unknown_status_containers: number
  grade_a: number
  grade_b: number
  grade_c: number
}

interface DepotSnapshot {
  name: string
  capacity_teu: number
  used_teu: number
  utilization: number
  status: "critical" | "warning" | "normal"
  available_teu: number
}

interface KPIProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ComponentType<{ className?: string }>
  color: string
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.0"
  return value.toFixed(1)
}

function getContainerDisplayStatus(dischargeStatus?: string | null): "empty" | "full" | "unknown" {
  const raw = dischargeStatus?.trim().toLowerCase()
  if (!raw) return "unknown"
  if (raw.startsWith("f")) return "full"
  if (raw.startsWith("m")) return "empty"
  return "unknown"
}

function normalizeGrade(grade?: string | null): "A" | "B" | "C" | undefined {
  if (!grade) return undefined
  const normalized = grade.trim().toUpperCase()
  if (normalized === "A" || normalized === "B" || normalized === "C") return normalized
  return undefined
}

export function EnhancedDashboard() {
  const [kpi, setKPI] = useState<KPIData | null>(null)
  const [depots, setDepots] = useState<DepotSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchDashboardData() {
    try {
      const supabase = createClient()

      const { data: depotsData } = await supabase
        .from("depots")
        .select("id, name, capacity_teu")
        .order("name")
      const { data: containersData } = await supabase
        .from("containers")
        .select("id, depot_id, size_teu, discharge_status, grade")

      if (!depotsData || !containersData) return

      const total_containers = containersData.length
      const total_teu = containersData.reduce((sum: number, c: any) => sum + (c.size_teu || 0), 0)
      const empty_containers = containersData.filter((c: any) => getContainerDisplayStatus(c.discharge_status) === "empty").length
      const full_containers = containersData.filter((c: any) => getContainerDisplayStatus(c.discharge_status) === "full").length
      const unknown_status_containers = containersData.filter(
        (c: any) => getContainerDisplayStatus(c.discharge_status) === "unknown",
      ).length
      const grade_a = containersData.filter((c: any) => normalizeGrade(c.grade) === "A").length
      const grade_b = containersData.filter((c: any) => normalizeGrade(c.grade) === "B").length
      const grade_c = containersData.filter((c: any) => normalizeGrade(c.grade) === "C").length

      const depotSnapshots: DepotSnapshot[] = depotsData.map((depot: any) => {
        const depotContainers = containersData.filter((c: any) => c.depot_id === depot.id)
        const used_teu = depotContainers.reduce((sum: number, c: any) => sum + (c.size_teu || 0), 0)
        const utilization = depot.capacity_teu > 0 ? (used_teu / depot.capacity_teu) * 100 : 0

        let status: "critical" | "warning" | "normal" = "normal"
        if (utilization >= 90) status = "critical"
        else if (utilization >= 80) status = "warning"

        return {
          name: depot.name,
          capacity_teu: depot.capacity_teu,
          used_teu,
          utilization,
          status,
          available_teu: depot.capacity_teu - used_teu,
        }
      })

      const depots_critical = depotSnapshots.filter((d) => d.status === "critical").length
      const depots_warning = depotSnapshots.filter((d) => d.status === "warning").length
      const total_capacity = depotsData.reduce((sum: number, d: any) => sum + d.capacity_teu, 0)
      const avg_utilization = total_capacity > 0 ? (total_teu / total_capacity) * 100 : 0

      setKPI({
        total_containers,
        total_teu,
        avg_utilization,
        depots_critical,
        depots_warning,
        empty_containers,
        full_containers,
        unknown_status_containers,
        grade_a,
        grade_b,
        grade_c,
      })
      setDepots(depotSnapshots)
      setError(null)
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  if (loading || !kpi) {
    return <div className="text-center py-8 text-muted-foreground">Loading dashboard...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">{error}</div>
  }

  const emptyPercentage = kpi.total_containers > 0 ? (kpi.empty_containers / kpi.total_containers) * 100 : 0

  const containerStatusData = [
    { name: "Empty", value: kpi.empty_containers, color: "#10b981" },
    { name: "Full", value: kpi.full_containers, color: "#3b82f6" },
    { name: "Unknown", value: kpi.unknown_status_containers, color: "#94a3b8" },
  ].filter((item) => item.value > 0 || item.name !== "Unknown")

  const gradeSummaryData = [
    { name: "Grade A", value: kpi.grade_a, color: "#10b981" },
    { name: "Grade B", value: kpi.grade_b, color: "#3b82f6" },
    { name: "Grade C", value: kpi.grade_c, color: "#f59e0b" },
  ]

  const depotChartData = depots.map((d) => ({
    name: d.name.replace("Depo ", ""),
    utilization: Number(formatPercent(d.utilization)),
    used: d.used_teu,
    capacity: d.capacity_teu,
    available: d.available_teu,
  }))

  const KPICard = ({ title, value, subtitle, icon: Icon, color }: KPIProps) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-lg ${color.replace("text", "bg").replace("-600", "-100 dark:bg-opacity-20")}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {(kpi.depots_critical > 0 || kpi.depots_warning > 0) && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300">
            {kpi.depots_critical} depot(s) at critical capacity, {kpi.depots_warning} at warning level
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Containers"
          value={kpi.total_containers}
          icon={Package}
          color="text-blue-600"
          subtitle={`${kpi.total_teu.toFixed(0)} TEU`}
        />
        <KPICard
          title="Avg Utilization"
          value={`${formatPercent(kpi.avg_utilization)}%`}
          icon={Zap}
          color={kpi.avg_utilization > 85 ? "text-red-600" : kpi.avg_utilization > 75 ? "text-yellow-600" : "text-green-600"}
          subtitle={kpi.avg_utilization > 85 ? "High" : kpi.avg_utilization > 75 ? "Medium" : "Optimal"}
        />
        <KPICard
          title="Empty Containers"
          value={kpi.empty_containers}
          icon={MapPin}
          color="text-green-600"
          subtitle={`${formatPercent(emptyPercentage)}% of total`}
        />
        <KPICard
          title="Critical Depots"
          value={kpi.depots_critical}
          icon={AlertTriangle}
          color={kpi.depots_critical > 0 ? "text-red-600" : "text-gray-600"}
          subtitle={`${kpi.depots_warning} warning`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Container Status Distribution</CardTitle>
            <CardDescription>Summary composition by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={containerStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={86}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {containerStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => {
                    const pct = kpi.total_containers > 0 ? (value / kpi.total_containers) * 100 : 0
                    return [`${value} (${formatPercent(pct)}%)`, "Containers"]
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Summary Grade</CardTitle>
            <CardDescription>Distribution of container grades (A/B/C)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gradeSummaryData.map((item) => {
              const pct = kpi.total_containers > 0 ? (item.value / kpi.total_containers) * 100 : 0
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">
                      {item.value} ({formatPercent(pct)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Depot Capacity Utilization</CardTitle>
          <CardDescription>Capacity usage by depot (moved above quick insights)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={depotChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} />
              <YAxis label={{ value: "Utilization %", angle: -90, position: "insideLeft" }} />
              <Tooltip
                formatter={(value: number, _name, payload: any) => {
                  if (payload?.dataKey === "utilization") return [`${formatPercent(value)}%`, "Utilization"]
                  return [String(value), payload?.name || "Value"]
                }}
                labelFormatter={(label, payload) => {
                  const row = payload?.[0]?.payload
                  if (!row) return String(label)
                  return `${label} | ${row.used.toFixed(0)} / ${row.capacity} TEU`
                }}
              />
              <Bar dataKey="utilization" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {kpi.avg_utilization > 85 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  High Overall Utilization: {formatPercent(kpi.avg_utilization)}%
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                  Consider rebalancing containers to depots with lower utilization.
                </p>
              </div>
            )}

            {kpi.empty_containers < kpi.total_containers * 0.2 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Low Empty Container Stock: {kpi.empty_containers} units</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Plan for container acquisition or rebalancing from other depots.
                </p>
              </div>
            )}

            {kpi.depots_critical === 0 && kpi.avg_utilization <= 75 && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">System Status: Healthy</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  All depots are operating within optimal capacity levels.
                </p>
              </div>
            )}

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Inventory Summary</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                {kpi.total_teu.toFixed(0)} TEU | {kpi.total_containers} containers across {depots.length} depots
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

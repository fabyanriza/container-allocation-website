"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, AlertTriangle, Package, Zap, MapPin, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts"

interface KPIData {
  total_containers: number
  total_teu: number
  avg_utilization: number
  depots_critical: number
  depots_warning: number
  empty_containers: number
  allocated_containers: number
  maintenance_containers: number
}

interface DepotSnapshot {
  name: string
  capacity_teu: number
  used_teu: number
  utilization: number
  status: "critical" | "warning" | "normal"
  available_teu: number
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

      // Fetch depots
      const { data: depotsData } = await supabase.from("depots").select("id, name, capacity_teu").order("name")

      // Fetch all containers
      const { data: containersData } = await supabase.from("containers").select("id, depot_id, size_teu, status")

      if (!depotsData || !containersData) return

      // Calculate KPI
      const total_containers = containersData.length
      const total_teu = containersData.reduce((sum: number, c: any) => sum + (c.size_teu || 0), 0)
      const empty_containers = containersData.filter((c: any) => c.status === "available").length
      const allocated_containers = containersData.filter((c: any) => c.status === "allocated").length
      const maintenance_containers = containersData.filter((c: any) => c.status === "maintenance").length

      // Calculate depot snapshots
      const depotSnapshots: DepotSnapshot[] = depotsData.map((depot: any) => {
        const depot_containers = containersData.filter((c: any) => c.depot_id === depot.id)
        const used_teu = depot_containers.reduce((sum: number, c: any) => sum + (c.size_teu || 0), 0)
        const utilization = (used_teu / depot.capacity_teu) * 100

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
      const avg_utilization = depotsData.length > 0 ? (total_teu / depotsData.reduce((sum: number, d: any) => sum + d.capacity_teu, 0)) * 100 : 0

      setKPI({
        total_containers,
        total_teu,
        avg_utilization,
        depots_critical,
        depots_warning,
        empty_containers,
        allocated_containers,
        maintenance_containers,
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

  // Data untuk pie chart
  const containerStatusData = [
    { name: "Empty", value: kpi.empty_containers, color: "#10b981" },
    { name: "Allocated", value: kpi.allocated_containers, color: "#3b82f6" },
    { name: "Maintenance", value: kpi.maintenance_containers, color: "#f59e0b" },
  ]

  // Data untuk depot utilization
  const depotChartData = depots.map((d) => ({
    name: d.name.replace("Depo ", ""),
    utilization: parseFloat(d.utilization.toFixed(1)),
    capacity: d.capacity_teu,
    used: d.used_teu,
  }))

  // KPI Card Component
  const KPICard = ({ title, value, subtitle, icon: Icon, trend, color }: any) => (
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
        {trend && (
          <div className={`mt-3 flex items-center gap-1 text-xs ${trend > 0 ? "text-red-600" : "text-green-600"}`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(trend)}% vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(kpi.depots_critical > 0 || kpi.depots_warning > 0) && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300">
            ⚠️ {kpi.depots_critical} depot(s) at critical capacity, {kpi.depots_warning} at warning level
          </AlertDescription>
        </Alert>
      )}

      {/* Top KPI Cards */}
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
          value={`${kpi.avg_utilization.toFixed(1)}%`}
          icon={Zap}
          color={kpi.avg_utilization > 85 ? "text-red-600" : kpi.avg_utilization > 75 ? "text-yellow-600" : "text-green-600"}
          subtitle={kpi.avg_utilization > 85 ? "High" : kpi.avg_utilization > 75 ? "Medium" : "Optimal"}
        />
        <KPICard
          title="Empty Containers"
          value={kpi.empty_containers}
          icon={MapPin}
          color="text-green-600"
          subtitle={`${((kpi.empty_containers / kpi.total_containers) * 100).toFixed(0)}% of total`}
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
        {/* Container Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Container Status</CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={containerStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {containerStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Depot Utilization Comparison */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Depot Utilization</CardTitle>
            <CardDescription>Capacity usage by depot</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={depotChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: "Utilization %", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                <Bar dataKey="utilization" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Depot Status Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Depot Status Overview</CardTitle>
          <CardDescription>Real-time capacity and inventory status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {depots.map((depot) => (
              <Card key={depot.name} className={`p-4 ${depot.status === "critical" ? "border-red-300 bg-red-50 dark:bg-red-950/20" : depot.status === "warning" ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{depot.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {depot.used_teu.toFixed(0)} / {depot.capacity_teu} TEU
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${depot.status === "critical" ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200" : depot.status === "warning" ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" : "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200"}`}>
                    {depot.status.toUpperCase()}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${depot.status === "critical" ? "bg-red-600" : depot.status === "warning" ? "bg-yellow-600" : "bg-green-600"}`}
                      style={{ width: `${Math.min(depot.utilization, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{depot.utilization.toFixed(1)}%</span>
                    <span className="text-green-600">{depot.available_teu.toFixed(0)} available</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {kpi.avg_utilization > 85 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  ⚠️ High Overall Utilization: {kpi.avg_utilization.toFixed(1)}%
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                  Consider rebalancing containers to depots with lower utilization
                </p>
              </div>
            )}

            {kpi.empty_containers < kpi.total_containers * 0.2 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  ℹ️ Low Empty Container Stock: {kpi.empty_containers} units
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Plan for container acquisition or rebalancing from other depots
                </p>
              </div>
            )}

            {kpi.depots_critical === 0 && kpi.avg_utilization <= 75 && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  ✓ System Status: Healthy
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  All depots operating within optimal capacity levels
                </p>
              </div>
            )}

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                📊 Total Inventory Value
              </p>
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

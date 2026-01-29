"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

interface DepotStatus {
  name: string
  capacity_teu: number
  used_teu: number
  percentage: number
  status: "critical" | "warning" | "normal"
}

export function RealtimeMonitoring() {
  const [depots, setDepots] = useState<DepotStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/statistics")
        const data = await res.json()

        if (data.statistics) {
          const depotStatuses = data.statistics.map((stat: any) => ({
            name: stat.depot_name,
            capacity_teu: stat.capacity,
            used_teu: stat.total_teu,
            percentage: (stat.total_teu / stat.capacity) * 100 || 0,
            status:
              (stat.total_teu / stat.capacity) * 100 >= 90
                ? "critical"
                : (stat.total_teu / stat.capacity) * 100 >= 80
                  ? "warning"
                  : "normal",
          }))

          setDepots(depotStatuses)
          setChartData(depotStatuses)
        }
      } catch (err) {
        console.error("Failed to fetch depot status", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div>Loading...</div>

  const criticalDepots = depots.filter((d) => d.status === "critical")
  const warningDepots = depots.filter((d) => d.status === "warning")

  return (
    <div className="space-y-6">
      {criticalDepots.length > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            Critical: {criticalDepots.map((d) => d.name).join(", ")} is at capacity limit!
          </AlertDescription>
        </Alert>
      )}

      {warningDepots.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300">
            Warning: {warningDepots.map((d) => d.name).join(", ")} is approaching capacity limit
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {depots.map((depot) => (
          <Card
            key={depot.name}
            className={
              depot.status === "critical" ? "border-red-300" : depot.status === "warning" ? "border-yellow-300" : ""
            }
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{depot.name}</CardTitle>
              <CardDescription className="text-sm">{depot.percentage.toFixed(1)}% Full</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      depot.status === "critical"
                        ? "bg-red-600"
                        : depot.status === "warning"
                          ? "bg-yellow-600"
                          : "bg-green-600"
                    }`}
                    style={{ width: `${Math.min(depot.percentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {depot.used_teu.toFixed(1)} / {depot.capacity_teu} TEU
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capacity Trend</CardTitle>
          <CardDescription>Real-time depot capacity overview</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              percentage: {
                label: "Capacity %",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="percentage" fill="var(--color-percentage)" name="Capacity %" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, TrendingUp } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"

interface ForecastData {
  depot_name: string
  depot_id: number
  current_empty: number
  forecast_needed: number
  forecast_confidence: number
  trend: "increasing" | "decreasing" | "stable"
  recommendation: string
}

interface ChartData {
  depot: string
  current: number
  forecast: number
}

export function ForecastEmptyContainers() {
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])

  useEffect(() => {
    fetchForecast()
  }, [])

  async function fetchForecast() {
    try {
      setLoading(true)
      const response = await fetch("/api/forecast/empty-containers")
      if (!response.ok) throw new Error("Failed to fetch forecast")
      
      const data = await response.json()
      setForecasts(data.forecasts || [])
      
      // Prepare chart data
      const chartData = data.forecasts.map((f: ForecastData) => ({
        depot: f.depot_name,
        current: f.current_empty,
        forecast: f.forecast_needed,
      }))
      setChartData(chartData)
    } catch (err) {
      console.error("Error fetching forecast:", err)
      setError("Gagal memuat forecast data. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  const criticalForecasts = forecasts.filter(
    (f) => f.forecast_needed > f.current_empty && (f.forecast_needed - f.current_empty) > 5
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading forecast data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Empty Container Forecast</h2>
          <p className="text-muted-foreground">Prediksi kebutuhan empty container berdasarkan pola historis</p>
        </div>
        <Button onClick={fetchForecast} variant="outline">
          Refresh Forecast
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {criticalForecasts.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300">
            ⚠️ Alert: {criticalForecasts.length} depo memerlukan penambahan empty container. Lihat detail di bawah.
          </AlertDescription>
        </Alert>
      )}

      {/* Chart Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Perbandingan Current vs Forecast</CardTitle>
          <CardDescription>Empty containers yang ada vs yang diperlukan per depot</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="depot" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" fill="#22c55e" name="Current Empty" />
              <Bar dataKey="forecast" fill="#3b82f6" name="Forecast Needed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Forecasts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {forecasts.map((forecast) => {
          const deficit = forecast.forecast_needed - forecast.current_empty
          const isCritical = deficit > 5

          return (
            <Card key={forecast.depot_id} className={isCritical ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{forecast.depot_name}</CardTitle>
                <CardDescription>
                  Confidence: {(forecast.forecast_confidence * 100).toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Empty</p>
                    <p className="text-2xl font-bold text-green-600">{forecast.current_empty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Forecast Needed</p>
                    <p className="text-2xl font-bold text-blue-600">{forecast.forecast_needed}</p>
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${deficit > 0 ? "bg-yellow-100 dark:bg-yellow-900/40" : "bg-green-100 dark:bg-green-900/40"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Deficit/Surplus</span>
                    <span className={`text-lg font-bold ${deficit > 0 ? "text-yellow-700 dark:text-yellow-300" : "text-green-700 dark:text-green-300"}`}>
                      {deficit > 0 ? "+" : ""}{deficit}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${forecast.trend === "increasing" ? "text-red-600" : forecast.trend === "decreasing" ? "text-green-600" : "text-gray-600"}`} />
                    <span className="text-sm capitalize">Trend: {forecast.trend}</span>
                  </div>
                  <p className="text-sm text-muted-foreground italic">{forecast.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

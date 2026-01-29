import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface ContainerActivity {
  depot_id: number
  depot_name: string
  activity: string
  created_at: string
  allocated_to?: string
  status: string
}

interface ForecastResult {
  depot_name: string
  depot_id: number
  current_empty: number
  forecast_needed: number
  forecast_confidence: number
  trend: "increasing" | "decreasing" | "stable"
  recommendation: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all depots with their details
    const { data: depots, error: depotsError } = await supabase.from("depots").select("id, name, capacity_teu").order("name")

    if (depotsError) throw depotsError

    // Fetch all containers with their allocation status
    const { data: containers, error: containersError } = await supabase.from("containers").select("id, depot_id, status, activity, size_teu, allocated_to, created_at").order("created_at", { ascending: false })

    if (containersError) throw containersError

    // Fetch activities from last 30 days for trend analysis
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activities, error: activitiesError } = await supabase
      .from("containers")
      .select("id, depot_id, activity, allocated_to, status, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })

    if (activitiesError) throw activitiesError

    // Calculate forecast for each depot
    const forecasts: ForecastResult[] = (depots || []).map((depot: any) => {
      // Count current empty containers in this depot
      const emptyContainers = (containers || []).filter((c: any) => c.depot_id === depot.id && c.status === "available" && !c.allocated_to).length

      // Analyze activity patterns from last 30 days
      const depoActivities = (activities || []).filter((a: any) => a.depot_id === depot.id)

      // Count inbound activities (containers being discharged/allocated to this depot)
      const inboundActivities = depoActivities.filter((a: any) => a.activity === "discharge" || a.allocated_to === depot.name).length

      // Count outbound activities (containers leaving this depot)
      const outboundActivities = depoActivities.filter((a: any) => a.activity === "rebalance" || a.activity === "allocation").length

      // Calculate daily average
      const daysInPeriod = 30
      const dailyInbound = inboundActivities / daysInPeriod
      const dailyOutbound = outboundActivities / daysInPeriod

      // Forecast for next 7 days
      const forecastDays = 7
      const predictedInbound = Math.ceil(dailyInbound * forecastDays)
      const predictedOutbound = Math.ceil(dailyOutbound * forecastDays)

      // Calculate needed empty containers (inbound - outbound + safety buffer)
      const safetyBuffer = Math.ceil(depot.capacity_teu * 0.1) // 10% of capacity
      const neededContainers = Math.max(5, predictedInbound + safetyBuffer)

      // Determine trend
      let trend: "increasing" | "decreasing" | "stable" = "stable"
      if (dailyInbound > dailyOutbound * 1.2) {
        trend = "increasing"
      } else if (dailyOutbound > dailyInbound * 1.2) {
        trend = "decreasing"
      }

      // Calculate confidence (based on activity volume)
      const totalActivity = inboundActivities + outboundActivities
      const confidence = Math.min(0.95, 0.5 + totalActivity / 100)

      // Generate recommendation
      let recommendation = ""
      const deficit = neededContainers - emptyContainers
      if (deficit > 10) {
        recommendation = `Perlukan penambahan ${deficit} empty container segera. Aktivitas inbound tinggi.`
      } else if (deficit > 5) {
        recommendation = `Rebalance ${deficit} empty container dari depot lain dalam waktu dekat.`
      } else if (deficit > 0) {
        recommendation = `Monitor ketat. Kemungkinan kekurangan ${deficit} container dalam 7 hari ke depan.`
      } else {
        recommendation = `Stock empty container sudah cukup. Pertahankan level saat ini.`
      }

      return {
        depot_name: depot.name,
        depot_id: depot.id,
        current_empty: emptyContainers,
        forecast_needed: neededContainers,
        forecast_confidence: confidence,
        trend,
        recommendation,
      }
    })

    return NextResponse.json({
      success: true,
      forecasts,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Forecast error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate forecast",
      },
      { status: 500 },
    )
  }
}

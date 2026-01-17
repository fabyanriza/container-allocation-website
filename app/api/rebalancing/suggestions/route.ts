import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all depots
    const { data: depots, error: depotsError } = await supabase.from("depots").select("*").order("name")

    if (depotsError) throw depotsError

    // Fetch all containers
    const { data: containers, error: containersError } = await supabase
      .from("containers")
      .select("*, depot:depot_id(name, capacity_teu)")

    if (containersError) throw containersError

    // Calculate depot usage
    const depotStats = depots.map((depot: any) => {
      const depotContainers = containers.filter((c: any) => c.depot_id === depot.id)
      const used_teu = depotContainers.reduce((sum: number, c: any) => sum + c.size_teu, 0)
      const usage_percentage = (used_teu / depot.capacity_teu) * 100

      return {
        ...depot,
        used_teu,
        usage_percentage,
        available_teu: depot.capacity_teu - used_teu,
        containers: depotContainers,
      }
    })

    // Find critical and warning depots
    const criticalDepots = depotStats.filter((d: any) => d.usage_percentage >= 90)
    const warningDepots = depotStats.filter((d: any) => d.usage_percentage >= 80 && d.usage_percentage < 90)

    // Generate rebalancing suggestions
    const suggestions = []
    const targetDepots = depotStats
      .filter((d: any) => d.usage_percentage < 80)
      .sort((a: any, b: any) => b.available_teu - a.available_teu)

    for (const sourceDepot of [...criticalDepots, ...warningDepots]) {
      // Find containers that can be moved
      const movableContainers = sourceDepot.containers
        .sort((a: any, b: any) => a.size_teu - b.size_teu)
        .slice(0, Math.ceil(sourceDepot.containers.length * 0.2)) // Move top 20% containers

      for (const container of movableContainers) {
        // Find suitable target depot
        const suitableTarget = targetDepots.find((t: any) => t.available_teu >= container.size_teu)

        if (suitableTarget) {
          suggestions.push({
            container_id: container.id,
            container_number: container.container_number,
            current_depot: sourceDepot.name,
            current_depot_id: sourceDepot.id,
            from_utilization: sourceDepot.usage_percentage.toFixed(1),
            recommended_depot: suitableTarget.name,
            recommended_depot_id: suitableTarget.id,
            to_utilization: (
              ((suitableTarget.used_teu + container.size_teu) / suitableTarget.capacity_teu) *
              100
            ).toFixed(1),
            size_teu: container.size_teu,
            priority: sourceDepot.usage_percentage >= 90 ? "high" : "medium",
            reason:
              sourceDepot.usage_percentage >= 90
                ? `${sourceDepot.name} is critically full (${sourceDepot.usage_percentage.toFixed(0)}%)`
                : `${sourceDepot.name} is approaching capacity (${sourceDepot.usage_percentage.toFixed(0)}%)`,
          })
        }
      }
    }

    return NextResponse.json(suggestions.slice(0, 10)) // Return top 10 suggestions
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

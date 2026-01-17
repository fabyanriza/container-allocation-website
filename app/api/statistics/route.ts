import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get depot statistics
    const { data: depots, error: depotsError } = await supabase.from("depots").select("id, name, capacity_teu")

    if (depotsError) throw depotsError

    // Calculate statistics
    const stats = await Promise.all(
      depots.map(async (depot) => {
        const { data: containers, error: containerError } = await supabase
          .from("containers")
          .select("size_teu, status")
          .eq("depot_id", depot.id)

        if (containerError) throw containerError

        const used_teu =
          containers?.reduce((sum, c) => {
            return sum + (c.status === "allocated" ? c.size_teu : 0)
          }, 0) || 0

        return {
          depot_id: depot.id,
          depot_name: depot.name,
          capacity_teu: depot.capacity_teu,
          used_teu,
          available_teu: depot.capacity_teu - used_teu,
          usage_percentage: (used_teu / depot.capacity_teu) * 100,
        }
      }),
    )

    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

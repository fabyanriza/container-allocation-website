import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: depots, error: depotsError } = await supabase.from("depots").select("*").order("name")

    if (depotsError) throw depotsError

    const depotsWithCapacity = await Promise.all(
      depots.map(async (depot) => {
        const { data: containers, error: containerError } = await supabase
          .from("containers")
          .select("size_teu")
          .eq("depot_id", depot.id)

        if (containerError) throw containerError

        const used_teu = containers.reduce((sum, c) => sum + (c.size_teu || 1), 0)
        const available_teu = depot.capacity_teu - used_teu

        return {
          ...depot,
          used_teu,
          available_teu,
          usage_percentage: (used_teu / depot.capacity_teu) * 100,
        }
      }),
    )

    return NextResponse.json(depotsWithCapacity)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

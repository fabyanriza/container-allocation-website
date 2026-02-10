import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

interface ContainerInput {
  container_number: string
  activity: string
  logistics: string
  size_teu: number
  state?: string
  discharge_status?: string
}

function normalizeDischargeState(raw?: string): string | undefined {
  if (!raw) return undefined
  const normalized = raw.trim().toUpperCase()
  return normalized || undefined
}

export async function POST(request: NextRequest) {
  try {
    const { containers } = await request.json()

    if (!Array.isArray(containers) || containers.length === 0) {
      return NextResponse.json({ error: "Invalid containers data" }, { status: 400 })
    }

    const supabase = await createServerClient()

    let imported = 0
    let created = 0
    let updated = 0

    for (const container of containers) {
      const { container_number, activity, logistics, size_teu, state, discharge_status } = container as ContainerInput
      const normalizedDischargeStatus = normalizeDischargeState(state ?? discharge_status)

      let depot_id = 1 // Default to Depo Yon

      const isInside = activity.includes("dalam")
      const logisticsYes = logistics.toLowerCase() === "yes"

      if (logisticsYes) {
        depot_id = 4 // Depo 4
      } else if (isInside) {
        // Inside activity without logistics: Japfa or Teluk Bayur
        depot_id = 2 // Default to Japfa
      }

      const { data: existingContainer } = await supabase
        .from("containers")
        .select("id")
        .eq("container_number", container_number)
        .single()

      if (existingContainer) {
        // Update existing container
        const { error: updateError } = await supabase
          .from("containers")
          .update({
            depot_id,
            size_teu,
            status: "available",
            ...(normalizedDischargeStatus ? { discharge_status: normalizedDischargeStatus } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("container_number", container_number)

        if (!updateError) {
          updated++
          imported++
        }
      } else {
        // Insert new container
        const { error: insertError } = await supabase.from("containers").insert({
          container_number,
          depot_id,
          size_teu,
          status: "available",
          ...(normalizedDischargeStatus ? { discharge_status: normalizedDischargeStatus } : {}),
        })

        if (!insertError) {
          created++
          imported++
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      created,
      updated,
      message: `Imported ${imported} containers (${created} created, ${updated} updated)`,
    })
  } catch (error) {
    console.error("Bulk import error:", error)
    return NextResponse.json({ error: "Failed to import containers" }, { status: 500 })
  }
}

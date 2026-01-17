import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

interface ManifestRow {
  vessel_name: string
  voyage_number: string
  container_number: string
  size_teu: number
  consignee_name: string
}

export async function POST(req: NextRequest) {
  try {
    const { containers } = (await req.json()) as { containers: ManifestRow[] }

    if (!containers || !Array.isArray(containers) || containers.length === 0) {
      return NextResponse.json({ error: "No containers to import" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    // Insert containers with MOB status
    const containerData = containers.map((container) => ({
      container_number: container.container_number,
      size_teu: container.size_teu,
      depot_id: 1, // Depo Yon (ID 1)
      activity: "stripping_luar",
      logistics: "no",
      status: "available",
      vessel_name: container.vessel_name,
      voyage_number: container.voyage_number,
      discharge_status: "MOB",
      consignee_name: container.consignee_name,
      discharge_date: new Date().toISOString(),
    }))

    const { error: insertError, data: insertedData } = await supabase.from("containers").insert(containerData).select()

    if (insertError) {
      console.error("[v0] Insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `${insertedData?.length || 0} containers imported successfully`,
      data: insertedData,
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

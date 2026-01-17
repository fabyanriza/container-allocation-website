import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { container_id, discharge_status } = await request.json()

    if (!container_id || !discharge_status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { error } = await supabase
      .from("containers")
      .update({
        discharge_status,
        discharge_date: discharge_status === "FAC" ? new Date().toISOString() : null,
      })
      .eq("id", container_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update discharge status error:", error)
    return NextResponse.json({ error: error.message || "Failed to update discharge status" }, { status: 500 })
  }
}

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("allocation_history")
      .select(
        `
      *,
      from_depot:from_depot_id(name),
      to_depot:to_depot_id(name)
    `,
      )
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    console.log("[v0] Processing allocation request:", body)

    const { container_id, from_depot_id, to_depot_id, quantity_teu, reason } = body

    // Update container's depot
    const { error: updateError } = await supabase
      .from("containers")
      .update({ depot_id: to_depot_id })
      .eq("id", container_id)

    if (updateError) throw new Error(`Failed to update container: ${updateError.message}`)

    // Record the allocation history
    const { data, error: insertError } = await supabase
      .from("allocation_history")
      .insert({
        container_id,
        from_depot_id,
        to_depot_id,
        quantity_teu,
        reason,
      })
      .select()

    if (insertError) throw new Error(`Failed to record allocation: ${insertError.message}`)

    console.log("[v0] Allocation successful:", data)
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Allocation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

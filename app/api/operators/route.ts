import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.from("operators").select("*").order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ operators: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { email, name } = await request.json()

  const { data, error } = await supabase
    .from("operators")
    .insert([{ email, name, is_active: true }])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ operator: data?.[0] })
}

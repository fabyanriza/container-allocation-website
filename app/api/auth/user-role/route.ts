import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role from custom users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("email", authData.user.email)
      .single()

    if (userError || !userData) {
      // Default to operator if not found
      return NextResponse.json({ role: "operator" })
    }

    return NextResponse.json({ role: userData.role })
  } catch (error) {
    console.error("Error getting user role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

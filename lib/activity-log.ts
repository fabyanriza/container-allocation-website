import { createClient } from "@/lib/supabase/server"

/**
 * Log activity untuk tracking user actions
 */
export async function logActivity(
  userEmail: string,
  action: "create" | "read" | "update" | "delete",
  resource: string,
  resourceId?: string | number,
  changes?: Record<string, any>,
) {
  try {
    const supabase = await createClient()

    await supabase.from("activity_logs").insert({
      user_email: userEmail,
      action,
      resource,
      resource_id: resourceId,
      changes,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error("Error logging activity:", err)
    // Don't throw - logging errors shouldn't break the operation
  }
}

/**
 * Check if request has valid authentication
 */
export async function getAuthUser() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return null
    }

    return data.user
  } catch (err) {
    console.error("Error getting auth user:", err)
    return null
  }
}

/**
 * Get user's role from database
 */
export async function getUserRole(email: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("users").select("role").eq("email", email).single()

    if (error || !data) {
      return null
    }

    return data.role
  } catch (err) {
    console.error("Error getting user role:", err)
    return null
  }
}

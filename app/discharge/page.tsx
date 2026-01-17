import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import DischargeTrackingDashboard from "@/components/discharge-tracking"

export default async function DischargePage() {
  const supabase = await createServerClient()
  const cookieStore = await cookies()

  const { data: manifests } = await supabase
    .from("manifests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20)

  const { data: recentContainers } = await supabase
    .from("containers")
    .select("*")
    .in("discharge_status", ["MOB", "MTA", "FAC"])
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Discharge Management</h1>
          <p className="text-muted-foreground">Track container discharge dari kapal (MOB, MTA, FAC)</p>
        </div>

        <DischargeTrackingDashboard manifests={manifests || []} containers={recentContainers || []} />
      </div>
    </main>
  )
}

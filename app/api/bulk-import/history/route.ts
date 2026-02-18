import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get("limit") ?? 50)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json({
        history: [],
        warning: "Session tidak valid atau user belum login.",
      })
    }

    // 1) Prefer dedicated table `import_history` if available in your Supabase project.
    const { data: importHistoryRows, error: importHistoryError } = await supabase
      .from("import_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (!importHistoryError && Array.isArray(importHistoryRows) && importHistoryRows.length > 0) {
      const history = importHistoryRows.map((row: Record<string, unknown>, index: number) => {
        const byDepotRaw = row.by_depot
        let byDepot: unknown[] = []
        if (Array.isArray(byDepotRaw)) {
          byDepot = byDepotRaw
        } else if (typeof byDepotRaw === "string" && byDepotRaw.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(byDepotRaw)
            byDepot = Array.isArray(parsed) ? parsed : []
          } catch {
            byDepot = []
          }
        }

        return {
          id: String(row.id ?? `${index}`),
          batch_id: String(row.batch_id ?? row.resource_id ?? row.id ?? `${index}`),
          user_email: String(row.user_email ?? row.email ?? user.email),
          file_name: String(row.file_name ?? row.filename ?? "-"),
          total_rows: Number(row.total_rows ?? row.total_data ?? 0),
          total_incoming_teu: Number(row.total_incoming_teu ?? row.total_teu ?? 0),
          imported: Number(row.imported ?? row.total_imported ?? 0),
          created: Number(row.created ?? row.total_created ?? 0),
          updated: Number(row.updated ?? row.total_updated ?? 0),
          by_depot: Array.isArray(byDepot) ? byDepot : [],
          timestamp: String(row.created_at ?? row.timestamp ?? new Date().toISOString()),
        }
      })

      return NextResponse.json({ history, warning: null, source: "import_history" })
    }

    // 2) Fallback to activity_logs (more permissive filter for old/new formats).
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, user_email, resource, resource_id, changes, timestamp")
      .order("timestamp", { ascending: false })
      .limit(Math.max(limit * 5, 200))

    if (error) {
      console.error("Failed query bulk import history:", error)
      return NextResponse.json({
        history: [],
        warning: "Riwayat tidak bisa diakses (kemungkinan policy/izin tabel activity_logs).",
      })
    }

    const candidateRows = (data ?? []).filter((row) => {
      const resource = String(row.resource ?? "").toLowerCase()
      const changes = (row.changes ?? {}) as Record<string, unknown>
      const hasImportShape =
        "file_name" in changes || "total_rows" in changes || "imported" in changes || "by_depot" in changes

      return resource.includes("bulk_import") || resource.includes("import") || hasImportShape
    })

    const history = candidateRows.slice(0, limit).map((row) => {
      const changes = (row.changes ?? {}) as {
        file_name?: string
        total_rows?: number
        total_incoming_teu?: number
        imported?: number
        created?: number
        updated?: number
        by_depot?: Array<{ depot_id: number; depot_name: string; incoming_teu: number }>
      }

      return {
        id: row.id,
        batch_id: row.resource_id,
        user_email: row.user_email,
        file_name: changes.file_name ?? "-",
        total_rows: changes.total_rows ?? 0,
        total_incoming_teu: changes.total_incoming_teu ?? 0,
        imported: changes.imported ?? 0,
        created: changes.created ?? 0,
        updated: changes.updated ?? 0,
        by_depot: changes.by_depot ?? [],
        timestamp: row.timestamp,
      }
    })

    return NextResponse.json({ history, warning: null, source: "activity_logs" })
  } catch (error) {
    console.error("Failed to fetch bulk import history:", error)
    return NextResponse.json({
      history: [],
      warning: "Terjadi error saat mengambil histori import.",
    })
  }
}

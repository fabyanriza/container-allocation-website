import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

interface ContainerInput {
  container_number: string
  activity: string
  logistics: string | boolean
  size_teu: number
  state?: string
  discharge_status?: string
  grade?: string
  depot_id?: number
  prevcy?: string
  bookno?: string
  cont_type?: string
}

interface BulkImportPayload {
  containers: ContainerInput[]
  import_filename?: string | null
  total_incoming_teu?: number
}

function normalizeDischargeState(raw?: string): string | undefined {
  if (!raw) return undefined
  const normalized = raw.trim().toUpperCase()
  return normalized || undefined
}

function normalizeActivity(raw?: string): string | undefined {
  if (!raw) return undefined
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_")
  const allowed = new Set([
    "stripping_luar",
    "stripping_dalam",
    "stuffing_luar",
    "stuffing_dalam",
  ])
  return allowed.has(normalized) ? normalized : undefined
}

function normalizeLogistics(raw: string | boolean | undefined): boolean {
  if (typeof raw === "boolean") return raw
  const normalized = String(raw ?? "")
    .trim()
    .toLowerCase()
  return ["yes", "y", "true", "1"].includes(normalized)
}

function normalizeGrade(raw?: string): "A" | "B" | "C" | undefined {
  if (!raw) return undefined
  const normalized = raw.trim().toUpperCase()
  if (normalized === "A" || normalized === "B" || normalized === "C") {
    return normalized
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as BulkImportPayload
    const containers = payload?.containers

    if (!Array.isArray(containers) || containers.length === 0) {
      return NextResponse.json({ error: "Invalid containers data" }, { status: 400 })
    }

    const supabase = await createServerClient()
    const importFilename =
      typeof payload?.import_filename === "string" && payload.import_filename.trim()
        ? payload.import_filename.trim()
        : `bulk-import-${new Date().toISOString()}`
    const incomingTeuByDepot = new Map<number, number>()

    let imported = 0
    let created = 0
    let updated = 0

    for (const container of containers) {
      const {
        container_number,
        activity,
        logistics,
        size_teu,
        state,
        discharge_status,
        grade,
        depot_id: providedDepotId,
        prevcy,
        bookno,
        cont_type,
      } = container as ContainerInput
      const normalizedDischargeStatus = normalizeDischargeState(state ?? discharge_status)
      const normalizedActivity = normalizeActivity(activity)
      const normalizedLogistics = normalizeLogistics(logistics)
      const normalizedGrade = normalizeGrade(grade)

      let depot_id = Number.isFinite(providedDepotId) ? Number(providedDepotId) : 1 // Default to Depo Yon

      const isInside = (normalizedActivity ?? "").includes("dalam")
      const logisticsYes = normalizedLogistics

      if (!Number.isFinite(providedDepotId) && logisticsYes) {
        depot_id = 4 // Depo 4
      } else if (!Number.isFinite(providedDepotId) && isInside) {
        // Inside activity without logistics: Japfa or Teluk Bayur
        depot_id = 2 // Default to Japfa
      }
      const incomingTeu = Number.isFinite(size_teu) ? Number(size_teu) : 1
      incomingTeuByDepot.set(depot_id, (incomingTeuByDepot.get(depot_id) ?? 0) + incomingTeu)

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
            ...(normalizedActivity ? { activity: normalizedActivity } : {}),
            logistics: normalizedLogistics,
            ...(normalizedGrade ? { grade: normalizedGrade } : {}),
            ...(prevcy ? { prevcy } : {}),
            ...(bookno ? { bookno } : {}),
            ...(cont_type ? { cont_type } : {}),
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
          ...(normalizedActivity ? { activity: normalizedActivity } : {}),
          logistics: normalizedLogistics,
          ...(normalizedGrade ? { grade: normalizedGrade } : {}),
          ...(prevcy ? { prevcy } : {}),
          ...(bookno ? { bookno } : {}),
          ...(cont_type ? { cont_type } : {}),
          ...(normalizedDischargeStatus ? { discharge_status: normalizedDischargeStatus } : {}),
        })

        if (!insertError) {
          created++
          imported++
        }
      }
    }

    const { data: depotRows } = await supabase.from("depots").select("id, name")
    const depotNameById = new Map<number, string>((depotRows ?? []).map((d) => [d.id, d.name]))
    const byDepot = Array.from(incomingTeuByDepot.entries())
      .map(([depot_id, incoming_teu]) => ({
        depot_id,
        depot_name: depotNameById.get(depot_id) ?? `Depot #${depot_id}`,
        incoming_teu: Number(incoming_teu.toFixed(2)),
      }))
      .sort((a, b) => b.incoming_teu - a.incoming_teu)

    const totalIncomingTeu =
      Number.isFinite(payload?.total_incoming_teu) && typeof payload?.total_incoming_teu === "number"
        ? payload.total_incoming_teu
        : byDepot.reduce((sum, d) => sum + d.incoming_teu, 0)

    const { data: auth } = await supabase.auth.getUser()
    const userEmail = auth?.user?.email ?? "unknown"
    const importBatchId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    await supabase.from("activity_logs").insert({
      user_email: userEmail,
      action: "create",
      resource: "bulk_import_file",
      resource_id: importBatchId,
      changes: {
        file_name: importFilename,
        total_rows: containers.length,
        total_incoming_teu: Number(totalIncomingTeu.toFixed(2)),
        imported,
        created,
        updated,
        by_depot: byDepot,
      },
      timestamp: new Date().toISOString(),
    })

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

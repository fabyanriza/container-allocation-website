"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

interface Depot {
  id: number;
  name: string;
  capacity_teu: number;
  location: string;
}

interface ContainerData {
  container_number: string;
  activity: string;
  logistics: string;
  size_teu: number;
  prevcy?: string; // Voyage/previous code
  bookno?: string; // Booking number
  cont_type?: string; // Container type (20 DC, 40 DC, etc)
  grade?: string; // Container grade (A, B, C)

  // user editable
  depot_id?: number;

  // from recommender
  recommended_depot_id?: number;
  recommendation_reason?: string;
}

interface BulkImportFormProps {
  onSuccess?: () => void;
}

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

function toNumber(v: unknown, fallback = 1) {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string"
        ? Number.parseFloat(v.replace(",", "."))
        : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export default function BulkImportForm({ onSuccess }: BulkImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ContainerData[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(false);

  const [parsing, setParsing] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // === Fetch depots for dropdown once ===
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("depots")
          .select("id,name,capacity_teu,location")
          .order("name");

        if (error) throw error;
        setDepots((data as Depot[]) ?? []);
      } catch (e) {
        console.error(e);
        setError("Failed to load depots list.");
      }
    })();
  }, []);

  const depotNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of depots) m.set(d.id, d.name);
    return m;
  }, [depots]);

  // === Recommendation call ===
  async function applyRecommendations(containers: ContainerData[]) {
    if (containers.length === 0) return containers;

    setRecommending(true);
    try {
      const res = await fetch("/api/recommend-depots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containers }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Recommendation failed");

      const recs: Array<{
        index: number;
        recommended_depot_id: number | null;
        reason?: string;
      }> = result.recommendations ?? [];

      const merged = containers.map((c, idx) => {
        const rec = recs.find((r) => r.index === idx);
        const recommendedId = rec?.recommended_depot_id ?? null;

        return {
          ...c,
          recommended_depot_id: recommendedId ?? undefined,
          recommendation_reason: rec?.reason,
          // set depot_id otomatis kalau belum diisi
          depot_id: c.depot_id ?? recommendedId ?? undefined,
        };
      });

      return merged;
    } finally {
      setRecommending(false);
    }
  }

  // === Handle file upload (CSV/XLSX) ===
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);
    setSuccess(null);
    setParsing(true);

    try {
      const name = uploadedFile.name.toLowerCase();
      let data: ContainerData[] = [];

      // ========= CSV =========
      if (name.endsWith(".csv")) {
        const text = await uploadedFile.text();
        const lines = text.split(/\r?\n/).filter((line) => line.trim());

        if (lines.length === 0) {
          setError("File CSV kosong");
          return;
        }

        // Parse header row
        const headerLine = lines[0];
        const headers = headerLine.split(",").map((h) => normalizeKey(h));

        // Find column indices by header name (support multiple naming variations)
        const colIndex = (names: string[]) => {
          for (const name of names) {
            const idx = headers.indexOf(name);
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const containerIdx = colIndex(["container_number", "no_container"]);
        const activityIdx = colIndex(["activity"]);
        const logisticsIdx = colIndex(["logistics", "logistic"]);
        const sizeTeuIdx = colIndex(["size_teu"]);
        const prevcyIdx = colIndex(["prevcy"]);
        const booknoIdx = colIndex(["bookno"]);
        const contTypeIdx = colIndex(["cont_type", "container_type"]);
        const gradeIdx = colIndex(["containergrade", "grade"]);
        const depotIdIdx = colIndex(["depot_id"]);

        if (
          containerIdx === -1 ||
          activityIdx === -1 ||
          logisticsIdx === -1 ||
          sizeTeuIdx === -1
        ) {
          setError(
            "CSV harus memiliki kolom: container_number, activity, logistics, size_teu",
          );
          return;
        }

        const dataLines = lines.slice(1); // skip header
        for (const line of dataLines) {
          const values = line.split(",").map((v) => v.trim());

          const container_number = values[containerIdx];
          const activity = values[activityIdx];
          const logistics = values[logisticsIdx];
          const size_teu = toNumber(values[sizeTeuIdx], 1);
          const prevcy = prevcyIdx !== -1 ? values[prevcyIdx] : undefined;
          const bookno = booknoIdx !== -1 ? values[booknoIdx] : undefined;
          const cont_type =
            contTypeIdx !== -1 ? values[contTypeIdx] : undefined;
          const grade = gradeIdx !== -1 ? values[gradeIdx] : undefined;
          const depot_id =
            depotIdIdx !== -1 && values[depotIdIdx]
              ? Number.parseInt(values[depotIdIdx], 10)
              : undefined;

          if (container_number && activity && logistics) {
            data.push({
              container_number,
              activity,
              logistics,
              size_teu,
              prevcy: prevcy || undefined,
              bookno: bookno || undefined,
              cont_type: cont_type || undefined,
              grade: grade || undefined,
              depot_id: Number.isFinite(depot_id) ? depot_id : undefined,
            });
          }
        }
      }

      // ========= XLSX =========
      else if (name.endsWith(".xlsx")) {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });

        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        data = rows
          .map((r) => {
            const normalized: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(r))
              normalized[normalizeKey(k)] = v;

            const container_number = String(
              normalized["no_container"] ??
                normalized["container_number"] ??
                "",
            ).trim();
            const activity = String(normalized["activity"] ?? "").trim();
            const logistics = String(
              normalized["logistic"] ?? normalized["logistics"] ?? "",
            ).trim();
            const size_teu = toNumber(normalized["size_teu"], 1);
            const prevcy =
              String(normalized["prevcy"] ?? "").trim() || undefined;
            const bookno =
              String(normalized["bookno"] ?? "").trim() || undefined;
            const cont_type =
              String(normalized["cont_type"] ?? "").trim() || undefined;
            const grade =
              String(
                normalized["containergrade"] ?? normalized["grade"] ?? "",
              ).trim() || undefined;

            // optional depot_id column
            const depot_id_raw = normalized["depot_id"];
            const depot_id =
              depot_id_raw === "" || depot_id_raw == null
                ? undefined
                : Number.isFinite(Number(depot_id_raw))
                  ? Number(depot_id_raw)
                  : undefined;

            if (!container_number || !activity || !logistics) return null;

            return {
              container_number,
              activity,
              logistics,
              size_teu,
              prevcy,
              bookno,
              cont_type,
              grade,
              depot_id,
            };
          })
          .filter(Boolean) as ContainerData[];
      } else {
        setError("Format file tidak didukung. Upload .csv atau .xlsx");
        return;
      }

      // set preview dulu biar langsung muncul
      setPreview(data);

      // lalu apply rekomendasi (auto isi depot kalau kosong)
      const withRec = await applyRecommendations(data);
      setPreview(withRec);
    } catch (err) {
      console.error(err);
      setError("Failed to parse file. Make sure it's a valid CSV/XLSX.");
    } finally {
      setParsing(false);
    }
  };

  // === Edit depot per row ===
  const updateDepot = (idx: number, depotId: number | undefined) => {
    setPreview((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, depot_id: depotId } : row)),
    );
  };

  const applyAllRecommended = () => {
    setPreview((prev) =>
      prev.map((row) => ({
        ...row,
        depot_id: row.recommended_depot_id ?? row.depot_id,
      })),
    );
  };

  const rerunRecommendation = async () => {
    const updated = await applyRecommendations(preview);
    setPreview(updated);
  };

  // === Import ===
  const handleImport = async () => {
    if (preview.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // kirim depot_id yang sudah diedit
      const response = await fetch("/api/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containers: preview.map(
            ({ recommended_depot_id, recommendation_reason, ...rest }) => rest,
          ),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      setSuccess(
        `Successfully imported ${result.imported} containers (${result.updated} updated, ${result.created} created)`,
      );
      setPreview([]);
      setFile(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Alokasi Bongkaran</h2>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 text-green-900 border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload CSV / XLSX File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={handleFileUpload}
              className="w-full px-4 py-2 border rounded-lg"
              disabled={parsing || loading}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Required columns: container_number/no_container, activity,
              logistics/logistic, size_teu
              <br />
              Optional columns: prevcy, bookno, cont_type, containergrade/grade,
              depot_id
            </p>
          </div>

          {(parsing || recommending) && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {parsing ? "Parsing file..." : "Running depot recommendation..."}
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-semibold">
                  Preview ({preview.length} containers)
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={rerunRecommendation}
                    disabled={recommending || loading}
                  >
                    Re-run Recommendation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={applyAllRecommended}
                    disabled={loading}
                  >
                    Apply All Recommended
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAllRows(!showAllRows)}
                  >
                    {showAllRows ? "Show Less" : "Show All"}
                  </Button>
                </div>
              </div>

              <div
                className="overflow-x-auto border rounded-lg"
                style={{
                  maxHeight: showAllRows ? "600px" : "auto",
                  overflowY: showAllRows ? "auto" : "visible",
                }}
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="border-b">
                      <th className="text-left p-2">Container Number</th>
                      <th className="text-left p-2">Activity</th>
                      <th className="text-left p-2">Logistics</th>
                      <th className="text-right p-2">TEU</th>
                      <th className="text-left p-2">Depot (editable)</th>
                      <th className="text-left p-2">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllRows ? preview : preview.slice(0, 25)).map(
                      (container, idx) => {
                        const selectedDepotName = container.depot_id
                          ? (depotNameById.get(container.depot_id) ??
                            `Depot #${container.depot_id}`)
                          : "—";

                        const recommendedName = container.recommended_depot_id
                          ? (depotNameById.get(
                              container.recommended_depot_id,
                            ) ?? `Depot #${container.recommended_depot_id}`)
                          : "—";

                        const isOverride =
                          container.depot_id &&
                          container.recommended_depot_id &&
                          container.depot_id !== container.recommended_depot_id;

                        return (
                          <tr
                            key={`${container.container_number}-${idx}`}
                            className="border-b hover:bg-muted/50"
                          >
                            <td className="p-2">
                              {container.container_number}
                            </td>
                            <td className="p-2">{container.activity}</td>
                            <td className="p-2">{container.logistics}</td>
                            <td className="p-2 text-right">
                              {Number.isFinite(container.size_teu)
                                ? container.size_teu
                                : 1}
                            </td>

                            {/* Editable depot */}
                            <td className="p-2">
                              <select
                                className="border rounded-md px-2 py-1 w-56"
                                value={container.depot_id ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateDepot(idx, v ? Number(v) : undefined);
                                }}
                                disabled={loading}
                              >
                                <option value="">— Select depot —</option>
                                {depots.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>

                              <div className="text-xs text-muted-foreground mt-1">
                                Selected: {selectedDepotName}
                                {isOverride ? " (override)" : ""}
                              </div>
                            </td>

                            {/* Recommendation */}
                            <td className="p-2">
                              <div className="font-medium">
                                {recommendedName}
                              </div>
                              {container.recommendation_reason && (
                                <div className="text-xs text-muted-foreground">
                                  {container.recommendation_reason}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              {!showAllRows && preview.length > 25 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing first 25 rows of {preview.length}. Klik "Show All"
                  untuk melihat semua. (Tetap akan import semua)
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleImport}
                  disabled={loading || preview.length === 0}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import {preview.length} Containers
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPreview([])}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface ContainerData {
  container_number: string;
  activity: string;
  logistics: string;
  size_teu: number;
  depot_id?: number;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);
    setSuccess(null);

    try {
      const name = uploadedFile.name.toLowerCase();

      // ========= CSV =========
      if (name.endsWith(".csv")) {
        const text = await uploadedFile.text();
        const lines = text.split(/\r?\n/).filter((line) => line.trim());

        // Skip header row
        const dataLines = lines.slice(1);
        const data: ContainerData[] = [];

        for (const line of dataLines) {
          const [container_number, activity, logistics, size_teu] = line
            .split(",")
            .map((v) => v.trim());

          if (container_number && activity && logistics && size_teu) {
            data.push({
              container_number,
              activity,
              logistics,
              size_teu: Number.parseFloat(size_teu) || 1,
            });
          }
        }

        setPreview(data);
        return;
      }

      // ========= XLSX =========
      if (name.endsWith(".xlsx")) {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });

        // pakai sheet pertama
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        // mapping kolom fleksibel (boleh "Container Number" dll)
        const data: ContainerData[] = rows
          .map((r) => {
            const normalized: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(r))
              normalized[normalizeKey(k)] = v;

            const container_number = String(
              normalized["container_number"] ?? ""
            ).trim();
            const activity = String(normalized["activity"] ?? "").trim();
            const logistics = String(normalized["logistics"] ?? "").trim();
            const size_teu = toNumber(normalized["size_teu"], 1);

            if (!container_number || !activity || !logistics) return null;

            return { container_number, activity, logistics, size_teu };
          })
          .filter(Boolean) as ContainerData[];

        setPreview(data);
        return;
      }

      setError("Format file tidak didukung. Upload .csv atau .xlsx");
    } catch {
      setError("Failed to parse file. Make sure it's a valid CSV/XLSX.");
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containers: preview }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      setSuccess(
        `Successfully imported ${result.imported} containers (${result.updated} updated, ${result.created} created)`
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
        <h2 className="text-2xl font-bold mb-4">Bulk Import Containers</h2>

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
            />
            <p className="text-xs text-muted-foreground mt-2">
              Expected columns (header): container_number, activity, logistics,
              size_teu
            </p>
          </div>

          {preview.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">
                Preview ({preview.length} containers)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Container Number</th>
                      <th className="text-left p-2">Activity</th>
                      <th className="text-left p-2">Logistics</th>
                      <th className="text-right p-2">TEU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((container, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{container.container_number}</td>
                        <td className="p-2">{container.activity}</td>
                        <td className="p-2">{container.logistics}</td>
                        <td className="p-2 text-right">{container.size_teu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.length > 10 && (
                <p className="text-xs text-muted-foreground mt-2">
                  +{preview.length - 10} more containers
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <Button onClick={handleImport} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import {preview.length} Containers
                </Button>
                <Button variant="outline" onClick={() => setPreview([])}>
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

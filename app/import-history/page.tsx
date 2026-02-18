"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

interface ImportHistoryItem {
  id: string
  batch_id: string
  user_email: string
  file_name: string
  total_rows: number
  total_incoming_teu: number
  imported: number
  created: number
  updated: number
  by_depot: Array<{ depot_id: number; depot_name: string; incoming_teu: number }>
  timestamp: string
}

export default function ImportHistoryPage() {
  const [history, setHistory] = useState<ImportHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchHistory() {
    try {
      setError(null)
      setWarning(null)
      const response = await fetch("/api/bulk-import/history?limit=100")
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to load history")
      }

      setHistory(result.history ?? [])
      setWarning(result.warning ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">History Alokasi per File</h1>
          <p className="text-muted-foreground">
            Riwayat file yang diimport pada Alokasi Bongkaran beserta ringkasan hasil import.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && warning && (
          <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Import Batches</CardTitle>
                <CardDescription>Menampilkan histori terbaru, refresh otomatis setiap 10 detik.</CardDescription>
              </div>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          </CardHeader>
          <CardContent>
            {!loading && history.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Belum ada histori import file.</div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">{item.file_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-sm">
                      <div className="rounded-md bg-muted/50 px-3 py-2">
                        Rows: <span className="font-medium">{item.total_rows}</span>
                      </div>
                      <div className="rounded-md bg-muted/50 px-3 py-2">
                        Imported: <span className="font-medium">{item.imported}</span>
                      </div>
                      <div className="rounded-md bg-muted/50 px-3 py-2">
                        Created: <span className="font-medium">{item.created}</span>
                      </div>
                      <div className="rounded-md bg-muted/50 px-3 py-2">
                        Updated: <span className="font-medium">{item.updated}</span>
                      </div>
                      <div className="rounded-md bg-muted/50 px-3 py-2">
                        Incoming: <span className="font-medium">{item.total_incoming_teu.toFixed(1)} TEU</span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">By user: {item.user_email}</div>

                    {item.by_depot.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium mb-1">Distribusi TEU per depo</div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {item.by_depot.map((depot) => (
                            <div key={`${item.id}-${depot.depot_id}`}>
                              {depot.depot_name}: {depot.incoming_teu.toFixed(1)} TEU
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

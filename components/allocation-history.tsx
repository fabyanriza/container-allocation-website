"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"

interface AllocationRecord {
  id: number
  container_id: number
  from_depot: { name: string }
  to_depot: { name: string }
  quantity_teu: number
  reason: string | null
  created_at: string
}

export default function AllocationHistory() {
  const [history, setHistory] = useState<AllocationRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  async function fetchHistory() {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("allocation_history")
        .select(
          `
        id,
        container_id,
        quantity_teu,
        reason,
        created_at,
        from_depot:from_depot_id(name),
        to_depot:to_depot_id(name)
      `,
        )
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error

      setHistory(
        data?.map((item: any) => ({
          ...item,
          from_depot: item.from_depot || { name: "Unknown" },
          to_depot: item.to_depot,
        })) || [],
      )
    } catch (err) {
      console.error("Error fetching history:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 border border-border">
        <h2 className="text-2xl font-bold mb-4 text-foreground">Recent Allocations</h2>
        <div className="text-center py-8 text-muted-foreground">Loading history...</div>
      </Card>
    )
  }

  return (
    <Card className="p-6 border border-border">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Recent Allocations</h2>

      {history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No allocations yet</div>
      ) : (
        <div className="space-y-3">
          {history.map((record) => (
            <div key={record.id} className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {record.from_depot.name} → {record.to_depot.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Container #{record.container_id}</p>
                </div>
                <span className="text-sm font-semibold text-blue-600">{record.quantity_teu} TEU</span>
              </div>

              {record.reason && <p className="text-xs text-muted-foreground mb-2">{record.reason}</p>}

              <p className="text-xs text-muted-foreground">{new Date(record.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

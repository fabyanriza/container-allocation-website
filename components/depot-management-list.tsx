"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"

interface Depot {
  id: number
  name: string
  capacity_teu: number
  location: string
}

export default function DepotManagementList({ onRefresh }: { onRefresh: () => void }) {
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDepots()
  }, [])

  async function fetchDepots() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("depots").select("*").order("name")

      if (error) throw error
      setDepots(data || [])
    } catch (err) {
      console.error("Error fetching depots:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading depots...</div>
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">Total Depots: {depots.length}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {depots.map((depot) => (
          <Card key={depot.id} className="p-6 border border-border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{depot.name}</h3>
                <p className="text-sm text-muted-foreground">{depot.location}</p>
              </div>
              <span className="text-lg font-bold text-blue-600">{depot.capacity_teu} TEU</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Capacity:</span>
                <span>{depot.capacity_teu} TEU</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Location:</span>
                <span>{depot.location}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

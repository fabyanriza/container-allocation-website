"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Depot {
  id: number
  name: string
  capacity_teu: number
}

interface Container {
  id: number
  container_number: string
  size_teu: number
}

export default function AllocationTransferForm({ onSuccess }: { onSuccess: () => void }) {
  const [depots, setDepots] = useState<Depot[]>([])
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    from_depot_id: "",
    to_depot_id: "",
    container_id: "",
    reason: "",
  })

  useEffect(() => {
    fetchDepots()
  }, [])

  useEffect(() => {
    if (formData.from_depot_id) {
      fetchContainers(Number.parseInt(formData.from_depot_id))
    } else {
      setContainers([])
    }
  }, [formData.from_depot_id])

  async function fetchDepots() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("depots").select("id, name, capacity_teu").order("name")

      if (error) throw error
      setDepots(data || [])
    } catch (err) {
      console.error("Error fetching depots:", err)
    }
  }

  async function fetchContainers(depotId: number) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("containers")
        .select("id, container_number, size_teu")
        .eq("depot_id", depotId)
        .eq("status", "available")

      if (error) throw error
      setContainers(data || [])
    } catch (err) {
      console.error("Error fetching containers:", err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      // Get container details
      const { data: containerData } = await supabase
        .from("containers")
        .select("size_teu")
        .eq("id", Number.parseInt(formData.container_id))
        .single()

      if (!containerData) throw new Error("Container not found")

      // Update container location
      const { error: updateError } = await supabase
        .from("containers")
        .update({ depot_id: Number.parseInt(formData.to_depot_id) })
        .eq("id", Number.parseInt(formData.container_id))

      if (updateError) throw updateError

      // Record allocation history
      const { error: historyError } = await supabase.from("allocation_history").insert({
        container_id: Number.parseInt(formData.container_id),
        from_depot_id: Number.parseInt(formData.from_depot_id),
        to_depot_id: Number.parseInt(formData.to_depot_id),
        quantity_teu: containerData.size_teu,
        reason: formData.reason || null,
        allocated_by: "System",
      })

      if (historyError) throw historyError

      setSuccess(true)
      setFormData({
        from_depot_id: "",
        to_depot_id: "",
        container_id: "",
        reason: "",
      })

      setTimeout(() => {
        setSuccess(false)
        onSuccess()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to allocate container")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 border border-border">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Transfer Container</h2>

      {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg text-sm">
          Container allocated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From Depot */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">From Depot</label>
          <select
            value={formData.from_depot_id}
            onChange={(e) => setFormData({ ...formData, from_depot_id: e.target.value, container_id: "" })}
            required
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select depot</option>
            {depots.map((depot) => (
              <option key={depot.id} value={depot.id}>
                {depot.name}
              </option>
            ))}
          </select>
        </div>

        {/* Container Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Container</label>
          <select
            value={formData.container_id}
            onChange={(e) => setFormData({ ...formData, container_id: e.target.value })}
            required
            disabled={!formData.from_depot_id}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="">Select container</option>
            {containers.map((container) => (
              <option key={container.id} value={container.id}>
                {container.container_number} ({container.size_teu} TEU)
              </option>
            ))}
          </select>
        </div>

        {/* To Depot */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">To Depot</label>
          <select
            value={formData.to_depot_id}
            onChange={(e) => setFormData({ ...formData, to_depot_id: e.target.value })}
            required
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select destination depot</option>
            {depots
              .filter((d) => d.id !== Number.parseInt(formData.from_depot_id || "0"))
              .map((depot) => (
                <option key={depot.id} value={depot.id}>
                  {depot.name}
                </option>
              ))}
          </select>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Reason (Optional)</label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Why is this container being transferred?"
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Processing..." : "Allocate Container"}
        </Button>
      </form>
    </Card>
  )
}

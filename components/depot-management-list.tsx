"use client"

import { useEffect, useState, type FormEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Depot {
  id: number
  name: string
  capacity_teu: number
  location: string
}

export default function DepotManagementList({ onRefresh }: { onRefresh: () => void }) {
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    capacity_teu: "",
    location: "",
  })

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

  async function handleAddDepot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const name = formData.name.trim()
    const location = formData.location.trim()
    const capacity = Number(formData.capacity_teu)

    if (!name || !location || !formData.capacity_teu) {
      setError("Semua field wajib diisi.")
      return
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      setError("Kapasitas depot harus lebih dari 0 TEU.")
      return
    }

    try {
      setSubmitting(true)
      const supabase = createClient()
      const { error: insertError } = await supabase.from("depots").insert({
        name,
        capacity_teu: capacity,
        location,
      })

      if (insertError) throw insertError

      setFormData({
        name: "",
        capacity_teu: "",
        location: "",
      })
      setSuccess("Depot berhasil ditambahkan.")
      await fetchDepots()
      onRefresh()
    } catch (err: any) {
      console.error("Error adding depot:", err)
      setError(err.message || "Gagal menambahkan depot.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading depots...</div>
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 border border-border">
        <h2 className="text-2xl font-bold mb-4 text-foreground">Tambah Depot</h2>

        {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleAddDepot} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nama Depot</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Contoh: Depo Baru"
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Kapasitas Depot (TEU)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={formData.capacity_teu}
              onChange={(e) => setFormData((prev) => ({ ...prev, capacity_teu: e.target.value }))}
              placeholder="Contoh: 120"
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Lokasi</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Contoh: Teluk Bayur"
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="md:col-span-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Tambah Depot"}
            </Button>
          </div>
        </form>
      </Card>

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

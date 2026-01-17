"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Depot {
  id: number
  name: string
  capacity_teu: number
  used_capacity?: number
}

interface RecommendationResult {
  primary: string
  alternatives: string[]
  reason: string
}

export default function ContainerForm({ onSubmitSuccess }: { onSubmitSuccess: () => void }) {
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showManualSelect, setShowManualSelect] = useState(false)
  const [selectedDepotId, setSelectedDepotId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    container_number: "",
    activity: "",
    logistics: "no",
    size_teu: "1",
    status: "available",
    allocated_to: "",
    notes: "",
  })

  useEffect(() => {
    fetchDepots()
  }, [])

  async function fetchDepots() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("depots").select("id, name, capacity_teu").order("name")

      if (error) throw error

      const depotsWithUsage = await Promise.all(
        (data || []).map(async (depot) => {
          const { data: containers } = await supabase.from("containers").select("size_teu").eq("depot_id", depot.id)

          const used = containers?.reduce((sum, c) => sum + (Number(c.size_teu) || 0), 0) || 0
          return { ...depot, used_capacity: used }
        }),
      )

      setDepots(depotsWithUsage)
    } catch (err) {
      console.error("Error fetching depots:", err)
      setError("Failed to load depots. Please refresh the page.")
    }
  }

  function calculateRecommendation(activity: string, logistics: string): RecommendationResult {
    const isOutside = activity === "stripping_luar" || activity === "stuffing_luar"
    const isLogistics = logistics === "yes"

    const getAvailableDepots = (depotNames: string[]) => {
      return depotNames.filter((name) => {
        const depot = depots.find((d) => d.name.toLowerCase().includes(name.toLowerCase()))
        if (!depot) return false
        const available = depot.capacity_teu - (depot.used_capacity || 0)
        return available >= Number.parseFloat(formData.size_teu)
      })
    }

    let result: RecommendationResult

    // 1. Outside + Logistics Yes = Yon → Depo 4
    // 2. Outside + Logistics No = Yon → Japfa/Teluk Bayur
    // 3. Inside + Logistics Yes = Depo 4
    // 4. Inside + Logistics No = Japfa/Teluk Bayur

    if (isLogistics) {
      // If logistics = yes, always prioritize Depo 4
      result = {
        primary: "Depo 4",
        alternatives: [],
        reason: isOutside
          ? "Aktivitas di luar dan dengan logistik → prioritas Depo 4"
          : "Aktivitas di dalam dan dengan logistik → prioritas Depo 4",
      }
    } else if (isOutside) {
      // Outside + No logistics = Yon first, then Japfa/Teluk Bayur
      const alternatives = getAvailableDepots(["japfa", "teluk bayur"])
      result = {
        primary: "Depo Yon",
        alternatives:
          alternatives.length > 0
            ? alternatives.map(
                (name) => depots.find((d) => d.name.toLowerCase().includes(name.toLowerCase()))?.name || name,
              )
            : ["Depo Japfa", "Depo Teluk Bayur"],
        reason: "Aktivitas di luar dan tanpa logistik → prioritas Yon, alternatif Japfa/Teluk Bayur",
      }
    } else {
      // Inside + No logistics = Japfa/Teluk Bayur
      const alternatives = getAvailableDepots(["japfa", "teluk bayur"])
      result = {
        primary: alternatives[0]
          ? depots.find((d) => d.name.toLowerCase().includes(alternatives[0].toLowerCase()))?.name || "Depo Japfa"
          : "Depo Japfa",
        alternatives: alternatives
          .slice(1)
          .map((name) => depots.find((d) => d.name.toLowerCase().includes(name.toLowerCase()))?.name || name),
        reason: "Aktivitas di dalam dan tanpa logistik → prioritas Japfa atau Teluk Bayur",
      }
    }

    return result
  }

  function handleFormChange(field: string, value: string) {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)

    if (newFormData.activity && newFormData.logistics) {
      const rec = calculateRecommendation(newFormData.activity, newFormData.logistics)
      setRecommendation(rec)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const primaryDepot = depots.find((d) => d.name === recommendation?.primary)
    if (primaryDepot) {
      setSelectedDepotId(primaryDepot.id)
      setShowConfirmDialog(true)
    }
  }

  async function handleConfirmedSubmit(depotId: number) {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      const selectedDepot = depots.find((d) => d.id === depotId)
      if (!selectedDepot) {
        throw new Error("Selected depot not found")
      }

      const available = selectedDepot.capacity_teu - (selectedDepot.used_capacity || 0)

      if (available < Number.parseFloat(formData.size_teu)) {
        throw new Error(`Insufficient capacity at ${selectedDepot.name}. Available: ${available} TEU`)
      }

      const containerData = {
        depot_id: depotId,
        container_number: formData.container_number,
        activity: formData.activity,
        logistics: formData.logistics === "yes",
        size_teu: Number.parseFloat(formData.size_teu),
        status: formData.status,
        allocated_to: formData.allocated_to || null,
        notes: formData.notes || null,
      }

      const { data: insertedData, error: insertError } = await supabase
        .from("containers")
        .insert(containerData)
        .select()

      if (insertError) throw insertError

      setSuccess(true)
      setFormData({
        container_number: "",
        activity: "",
        logistics: "no",
        size_teu: "1",
        status: "available",
        allocated_to: "",
        notes: "",
      })
      setRecommendation(null)
      setShowConfirmDialog(false)
      setShowManualSelect(false)

      setTimeout(() => {
        setSuccess(false)
        onSubmitSuccess()
      }, 2000)
    } catch (err: any) {
      console.error("Error adding container:", err)
      setError(err.message || "Failed to add container")
    } finally {
      setLoading(false)
    }
  }

  function handleDeclineRecommendation() {
    setShowConfirmDialog(false)
    setShowManualSelect(true)
  }

  const availableDepots = depots.filter((depot) => {
    const available = depot.capacity_teu - (depot.used_capacity || 0)
    return available >= Number.parseFloat(formData.size_teu)
  })

  return (
    <>
      <Card className="p-6 border border-border max-w-3xl">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Add Container</h2>

        {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg text-sm">
            Container added successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">No Container</label>
              <input
                type="text"
                value={formData.container_number}
                onChange={(e) => handleFormChange("container_number", e.target.value)}
                placeholder="e.g., CONT-001"
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Aktivitas</label>
              <select
                value={formData.activity}
                onChange={(e) => handleFormChange("activity", e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Pilih aktivitas</option>
                <option value="stripping_luar">Stripping Luar</option>
                <option value="stripping_dalam">Stripping Dalam</option>
                <option value="stuffing_luar">Stuffing Luar</option>
                <option value="stuffing_dalam">Stuffing Dalam</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Logistics</label>
              <select
                value={formData.logistics}
                onChange={(e) => handleFormChange("logistics", e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">TEU</label>
              <input
                type="number"
                step="0.5"
                value={formData.size_teu}
                onChange={(e) => handleFormChange("size_teu", e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleFormChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="available">Available</option>
                <option value="allocated">Allocated</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Allocated To (Optional)</label>
              <input
                type="text"
                value={formData.allocated_to}
                onChange={(e) => handleFormChange("allocated_to", e.target.value)}
                placeholder="Customer or project name"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="Additional notes"
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {recommendation && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Rekomendasi Alokasi
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-blue-800 dark:text-blue-200">
                  <span className="font-medium">Depot Utama:</span> {recommendation.primary}
                </p>
                {recommendation.alternatives.length > 0 && (
                  <p className="text-blue-700 dark:text-blue-300">
                    <span className="font-medium">Alternatif:</span> {recommendation.alternatives.join(", ")}
                  </p>
                )}
                <p className="text-blue-600 dark:text-blue-400 text-xs italic mt-2">{recommendation.reason}</p>
              </div>
            </Card>
          )}

          <Button type="submit" disabled={loading || !recommendation} className="w-full">
            {loading ? "Adding..." : "Add Container"}
          </Button>
        </form>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Alokasi Container</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>
                Apakah Anda yakin container <span className="font-semibold">{formData.container_number}</span> akan
                dialokasikan ke <span className="font-semibold">{recommendation?.primary}</span>?
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                <div>TEU: {formData.size_teu}</div>
                <div>
                  Aktivitas: {formData.activity.replace("_", " ").charAt(0).toUpperCase() + formData.activity.slice(1)}
                </div>
                <div>Logistics: {formData.logistics === "yes" ? "Yes" : "No"}</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeclineRecommendation}>Tidak, Pilih Depot Lain</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedDepotId && handleConfirmedSubmit(selectedDepotId)}>
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showManualSelect} onOpenChange={setShowManualSelect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pilih Depot Secara Manual</AlertDialogTitle>
            <AlertDialogDescription>
              Silakan pilih depot yang ingin Anda gunakan untuk container{" "}
              <span className="font-semibold">{formData.container_number}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">Depot Tujuan</label>
            <select
              value={selectedDepotId || ""}
              onChange={(e) => setSelectedDepotId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="">Pilih depot</option>
              {availableDepots.map((depot) => (
                <option key={depot.id} value={depot.id}>
                  {depot.name} - Tersedia: {(depot.capacity_teu - (depot.used_capacity || 0)).toFixed(1)} TEU
                </option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedDepotId}
              onClick={() => selectedDepotId && handleConfirmedSubmit(selectedDepotId)}
            >
              Konfirmasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

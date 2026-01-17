"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Loader2, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Container {
  id: number
  container_number: string
  size_teu: number
  activity: string
  logistics: string
  depot_id: number
}

interface Depot {
  id: number
  name: string
  capacity_teu: number
  used_teu?: number
  available_teu?: number
}

interface ContainerSelectionModalProps {
  depot: Depot
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ContainerSelectionModal({ depot, open, onOpenChange }: ContainerSelectionModalProps) {
  const [containers, setContainers] = useState<Container[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [selectedContainers, setSelectedContainers] = useState<number[]>([])
  const [selectedTargetDepot, setSelectedTargetDepot] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open && depot) {
      loadData()
    }
  }, [open, depot])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load containers from current depot
      const containersRes = await fetch(`/api/containers?depot_id=${depot.id}`)
      if (!containersRes.ok) throw new Error("Failed to load containers")
      const containersData = await containersRes.json()
      setContainers(containersData || [])

      // Load all depots
      const depotsRes = await fetch("/api/depots")
      if (!depotsRes.ok) throw new Error("Failed to load depots")
      const depotsData = await depotsRes.json()
      // Filter out current depot and only show depots with available capacity
      const availableDepots = depotsData.filter((d: Depot) => d.id !== depot.id && (d.available_teu || 0) > 0)
      setDepots(availableDepots)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
      console.log("[v0] Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleContainerToggle = (containerId: number) => {
    setSelectedContainers((prev) =>
      prev.includes(containerId) ? prev.filter((id) => id !== containerId) : [...prev, containerId],
    )
  }

  const handleMove = async () => {
    if (selectedContainers.length === 0 || !selectedTargetDepot) {
      setError("Please select at least one container and a target depot")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const selectedContainerData = containers.filter((c) => selectedContainers.includes(c.id))

      // Move each container
      for (const container of selectedContainerData) {
        const res = await fetch("/api/allocation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_depot_id: depot.id,
            to_depot_id: selectedTargetDepot,
            container_id: container.id,
            quantity_teu: container.size_teu,
            reason: "Manual reallocation from critical capacity warning",
          }),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(`Failed to move container ${container.container_number}: ${errorData.message}`)
        }
      }

      setSuccess(true)
      setSelectedContainers([])
      setSelectedTargetDepot(null)

      // Close dialog after 2 seconds
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move containers")
      console.log("[v0] Error moving containers:", err)
    } finally {
      setLoading(false)
    }
  }

  const selectedTeu = containers
    .filter((c) => selectedContainers.includes(c.id))
    .reduce((sum, c) => sum + c.size_teu, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Move Containers from {depot.name}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">Containers moved successfully!</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Depot Info */}
            <Card className="p-3 bg-slate-50">
              <p className="text-sm font-semibold">Current Depot</p>
              <p className="text-lg font-bold">{depot.name}</p>
              <p className="text-sm text-muted-foreground">
                {(depot.used_teu || 0).toFixed(1)} / {depot.capacity_teu} TEU
              </p>
            </Card>

            {/* Container Selection */}
            <div>
              <p className="text-sm font-semibold mb-2">
                Select Containers ({selectedContainers.length} selected, {selectedTeu.toFixed(1)} TEU)
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {containers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No containers in this depot</p>
                ) : (
                  containers.map((container) => (
                    <label
                      key={container.id}
                      className="flex items-center p-2 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContainers.includes(container.id)}
                        onChange={() => handleContainerToggle(container.id)}
                        className="mr-2"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{container.container_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {container.size_teu} TEU • {container.activity}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Target Depot Selection */}
            <div>
              <p className="text-sm font-semibold mb-2">Select Target Depot</p>
              <div className="space-y-2">
                {depots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded">
                    No depots with available capacity
                  </p>
                ) : (
                  depots.map((targetDepot) => (
                    <button
                      key={targetDepot.id}
                      onClick={() => setSelectedTargetDepot(targetDepot.id)}
                      className={`w-full p-3 rounded border text-left transition ${
                        selectedTargetDepot === targetDepot.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{targetDepot.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(targetDepot.used_teu || 0).toFixed(1)} / {targetDepot.capacity_teu} TEU
                          </p>
                        </div>
                        <Badge variant="outline">{(targetDepot.available_teu || 0).toFixed(1)} TEU</Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={loading || selectedContainers.length === 0 || !selectedTargetDepot}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              "Move Containers"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

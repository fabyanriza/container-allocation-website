"use client"

import { useState } from "react"
import ManifestImportForm from "./manifest-import-form"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

interface Manifest {
  id: number
  vessel_name: string
  voyage_number: string
  total_containers: number
  total_teu: number
  status: string
  eta_date?: string
  created_at: string
}

interface Container {
  id: number
  container_number: string
  vessel_name: string
  voyage_number: string
  discharge_status: string
  size_teu: number
  consignee_name?: string
  activity?: string
}

export default function DischargeTrackingDashboard({
  manifests,
  containers,
}: {
  manifests: Manifest[]
  containers: Container[]
}) {
  const [activeTab, setActiveTab] = useState<"manifest" | "tracking">("manifest")
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<"MOB" | "MTA" | "FAC">("MOB")
  const [updating, setUpdating] = useState(false)

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
    window.location.reload()
  }

  const handleUpdateStatus = async (container: Container) => {
    setSelectedContainer(container)
    setNewStatus(container.discharge_status as "MOB" | "MTA" | "FAC")
    setShowStatusDialog(true)
  }

  const confirmStatusUpdate = async () => {
    if (!selectedContainer) return

    setUpdating(true)
    try {
      const response = await fetch("/api/container/update-discharge-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          container_id: selectedContainer.id,
          discharge_status: newStatus,
        }),
      })

      if (!response.ok) throw new Error("Failed to update status")

      setShowStatusDialog(false)
      handleRefresh()
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setUpdating(false)
    }
  }

  const statusColors = {
    MOB: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300",
    MTA: "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300",
    FAC: "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300",
  }

  const statusLabels = {
    MOB: "Empty on Board",
    MTA: "Empty to Available",
    FAC: "Full at Consignee",
  }

  return (
    <>
      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === "manifest" ? "default" : "outline"} onClick={() => setActiveTab("manifest")}>
          Import Manifest
        </Button>
        <Button variant={activeTab === "tracking" ? "default" : "outline"} onClick={() => setActiveTab("tracking")}>
          Tracking Discharge
        </Button>
      </div>

      {activeTab === "manifest" && <ManifestImportForm onSuccess={handleRefresh} />}

      {activeTab === "tracking" && (
        <div className="space-y-6">
          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["MOB", "MTA", "FAC"] as const).map((status) => {
              const count = containers.filter((c) => c.discharge_status === status).length
              return (
                <Card key={status} className="p-6">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-2">{statusLabels[status]}</p>
                    <p className={`text-3xl font-bold ${statusColors[status].split(" ")[0]}`}>{count}</p>
                    <p className="text-sm text-muted-foreground mt-2">Container</p>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Recent Manifests */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 text-foreground">Recent Manifests</h3>
            <div className="space-y-3">
              {manifests.slice(0, 5).map((manifest) => (
                <div key={manifest.id} className="p-4 border border-border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-foreground">{manifest.vessel_name}</p>
                      <p className="text-sm text-muted-foreground">Voyage: {manifest.voyage_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {manifest.total_containers} containers ({manifest.total_teu} TEU)
                      </p>
                    </div>
                    <Badge variant="outline">{manifest.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Container Tracking */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 text-foreground">Container Status Tracking</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {containers.map((container) => (
                <div
                  key={container.id}
                  className="p-4 border border-border rounded-lg flex justify-between items-center hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{container.container_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {container.vessel_name} - Voyage {container.voyage_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {container.size_teu} TEU {container.consignee_name && `• ${container.consignee_name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[container.discharge_status as "MOB" | "MTA" | "FAC"]}>
                      {statusLabels[container.discharge_status as "MOB" | "MTA" | "FAC"]}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(container)}>
                      Update
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Discharge Status</AlertDialogTitle>
            <AlertDialogDescription>
              Ubah status container <span className="font-semibold">{selectedContainer?.container_number}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            {(["MOB", "MTA", "FAC"] as const).map((status) => (
              <label
                key={status}
                className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent"
              >
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={newStatus === status}
                  onChange={(e) => setNewStatus(e.target.value as "MOB" | "MTA" | "FAC")}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium">{status}</p>
                  <p className="text-sm text-muted-foreground">{statusLabels[status]}</p>
                </div>
              </label>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusUpdate} disabled={updating}>
              {updating ? "Updating..." : "Update Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

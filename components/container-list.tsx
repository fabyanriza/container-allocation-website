"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, X, Download, FileSpreadsheet, Trash2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { exportToCSV, exportToExcel } from "@/lib/export-utils"

interface Container {
  id: number
  container_number: string
  teu_size: number
  activity: string
  logistics: boolean
  depot_id: number
  status: string
  created_at: string
  depots?: {
    name: string
  }
}

interface Depot {
  id: number
  name: string
}

export default function ContainerList({ refreshKey }: { refreshKey?: number }) {
  const [containers, setContainers] = useState<Container[]>([])
  const [filteredContainers, setFilteredContainers] = useState<Container[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; containerId: number | null; containerNumber: string }>({
    open: false,
    containerId: null,
    containerNumber: "",
  })

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepot, setSelectedDepot] = useState<string>("all")
  const [selectedActivity, setSelectedActivity] = useState<string>("all")
  const [selectedLogistics, setSelectedLogistics] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")

  useEffect(() => {
    fetchData()
  }, [refreshKey])

  useEffect(() => {
    applyFilters()
  }, [containers, searchTerm, selectedDepot, selectedActivity, selectedLogistics, selectedStatus])

  async function fetchData() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch containers with depot info
      const { data: containersData, error: containersError } = await supabase
        .from("containers")
        .select("*, depots(name)")
        .order("created_at", { ascending: false })

      if (containersError) throw containersError

      // Fetch depots for filter
      const { data: depotsData, error: depotsError } = await supabase.from("depots").select("id, name").order("name")

      if (depotsError) throw depotsError

      setContainers(containersData || [])
      setDepots(depotsData || [])
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...containers]

    // Search by container number
    if (searchTerm) {
      filtered = filtered.filter((c) => c.container_number.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Filter by depot
    if (selectedDepot !== "all") {
      filtered = filtered.filter((c) => c.depot_id === Number.parseInt(selectedDepot))
    }

    // Filter by activity
    if (selectedActivity !== "all") {
      filtered = filtered.filter((c) => c.activity === selectedActivity)
    }

    // Filter by logistics
    if (selectedLogistics !== "all") {
      const isLogistics = selectedLogistics === "yes"
      filtered = filtered.filter((c) => c.logistics === isLogistics)
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((c) => c.status === selectedStatus)
    }

    setFilteredContainers(filtered)
  }

  function clearFilters() {
    setSearchTerm("")
    setSelectedDepot("all")
    setSelectedActivity("all")
    setSelectedLogistics("all")
    setSelectedStatus("all")
  }

  async function handleDeleteContainer(id: number) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/containers?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete container")

      // Remove from local state
      setContainers((prev) => prev.filter((c) => c.id !== id))
      setDeleteDialog({ open: false, containerId: null, containerNumber: "" })
    } catch (err) {
      console.error("Error deleting container:", err)
      alert("Failed to delete container")
    } finally {
      setDeleting(null)
    }
  }

  function openDeleteDialog(id: number, containerNumber: string) {
    setDeleteDialog({ open: true, containerId: id, containerNumber })
  }

  function handleExportCSV() {
    const exportData = filteredContainers.map((c) => ({
      container_number: c.container_number,
      depot: c.depots?.name || "Unknown",
      teu_size: c.teu_size,
      activity: c.activity,
      logistics: c.logistics ? "Yes" : "No",
      status: c.status,
      created_at: new Date(c.created_at).toLocaleString("id-ID"),
    }))
    exportToCSV(exportData, `containers_${new Date().toISOString().split("T")[0]}`)
  }

  function handleExportExcel() {
    const exportData = filteredContainers.map((c) => ({
      container_number: c.container_number,
      depot: c.depots?.name || "Unknown",
      teu_size: c.teu_size,
      activity: c.activity,
      logistics: c.logistics ? "Yes" : "No",
      status: c.status,
      created_at: new Date(c.created_at).toLocaleString("id-ID"),
    }))
    exportToExcel(exportData, `containers_${new Date().toISOString().split("T")[0]}`)
  }

  const hasActiveFilters =
    searchTerm ||
    selectedDepot !== "all" ||
    selectedActivity !== "all" ||
    selectedLogistics !== "all" ||
    selectedStatus !== "all"

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading containers...</div>
  }

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Search & Filter</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search container number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Depot Filter */}
          <Select value={selectedDepot} onValueChange={setSelectedDepot}>
            <SelectTrigger>
              <SelectValue placeholder="All Depots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depots</SelectItem>
              {depots.map((depot) => (
                <SelectItem key={depot.id} value={depot.id.toString()}>
                  {depot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Activity Filter */}
          <Select value={selectedActivity} onValueChange={setSelectedActivity}>
            <SelectTrigger>
              <SelectValue placeholder="All Activities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="stripping_luar">Stripping Luar</SelectItem>
              <SelectItem value="stripping_dalam">Stripping Dalam</SelectItem>
              <SelectItem value="stuffing_luar">Stuffing Luar</SelectItem>
              <SelectItem value="stuffing_dalam">Stuffing Dalam</SelectItem>
            </SelectContent>
          </Select>

          {/* Logistics Filter */}
          <Select value={selectedLogistics} onValueChange={setSelectedLogistics}>
            <SelectTrigger>
              <SelectValue placeholder="Logistics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Logistics</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredContainers.length} of {containers.length} containers
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Container List */}
      {filteredContainers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No containers found matching your filters</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContainers.map((container) => (
            <Card key={container.id} className="p-6 border border-border hover:border-primary transition-colors">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{container.container_number}</h3>
                    <p className="text-sm text-muted-foreground">{container.depots?.name || "Unknown Depot"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="font-mono">
                      {container.teu_size} TEU
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Activity:</span>
                    <span className="font-medium capitalize">{container.activity?.replace(/_/g, " ") || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Logistics:</span>
                    <Badge variant={container.logistics ? "default" : "secondary"}>
                      {container.logistics ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={container.status === "available" ? "default" : "secondary"}>
                      {container.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Added:</span>
                    <span className="text-xs">{new Date(container.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => openDeleteDialog(container.id, container.container_number)}
                    disabled={deleting === container.id}
                  >
                    {deleting === container.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Container</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete container <strong>{deleteDialog.containerNumber}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDialog.containerId && handleDeleteContainer(deleteDialog.containerId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting !== null}
            >
              {deleting !== null ? <Loader2 className="h-4 w-4 mr-2 animate-spin inline" /> : null}
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

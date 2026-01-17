"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, AlertCircle, Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import ContainerSelectionModal from "./container-selection-modal"

interface Depot {
  id: number
  name: string
  capacity_teu: number
  used_teu?: number
  available_teu?: number
  usage_percentage?: number
}

interface CapacityAlertsProps {
  depots: Depot[]
}

export default function CapacityAlerts({ depots }: CapacityAlertsProps) {
  const [selectedCriticalDepot, setSelectedCriticalDepot] = useState<Depot | null>(null)

  // Categorize depots by alert level
  const criticalDepots = depots.filter((d) => (d.usage_percentage || 0) >= 90)
  const warningDepots = depots.filter((d) => (d.usage_percentage || 0) >= 80 && (d.usage_percentage || 0) < 90)
  const normalDepots = depots.filter((d) => (d.usage_percentage || 0) < 80)

  const hasAlerts = criticalDepots.length > 0 || warningDepots.length > 0

  if (!hasAlerts) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900">
        <Info className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-300">All Depots Operating Normally</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          All depots are operating within safe capacity levels.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Critical Alerts (>= 90%) */}
      {criticalDepots.length > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 dark:text-red-300">Critical Capacity Warning</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-400">
            <p className="mb-3">The following depots are critically full (≥90% capacity):</p>
            <div className="space-y-2">
              {criticalDepots.map((depot) => (
                <Card key={depot.id} className="p-3 bg-white dark:bg-slate-800 border-red-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{depot.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {(depot.used_teu || 0).toFixed(1)} / {depot.capacity_teu || 0} TEU
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="font-bold">
                        {(depot.usage_percentage || 0).toFixed(0)}% FULL
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Only {(depot.available_teu || 0).toFixed(1)} TEU available
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 border-red-300 text-red-600 hover:bg-red-100 bg-transparent"
                        onClick={() => setSelectedCriticalDepot(depot)}
                      >
                        Move Containers
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning Alerts (80-89%) */}
      {warningDepots.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-300">Capacity Warning</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            <p className="mb-3">The following depots are approaching capacity (80-89% full):</p>
            <div className="space-y-2">
              {warningDepots.map((depot) => (
                <Card key={depot.id} className="p-3 bg-white dark:bg-slate-800 border-yellow-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{depot.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {(depot.used_teu || 0).toFixed(1)} / {depot.capacity_teu || 0} TEU
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="border-yellow-600 text-yellow-600 font-bold">
                        {(depot.usage_percentage || 0).toFixed(0)}% FULL
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(depot.available_teu || 0).toFixed(1)} TEU remaining
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Info */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Card className="p-3 bg-red-50 dark:bg-red-900/10 border-red-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{criticalDepots.length}</p>
            <p className="text-xs text-red-700 dark:text-red-400">Critical</p>
          </div>
        </Card>
        <Card className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{warningDepots.length}</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">Warning</p>
          </div>
        </Card>
        <Card className="p-3 bg-green-50 dark:bg-green-900/10 border-green-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{normalDepots.length}</p>
            <p className="text-xs text-green-700 dark:text-green-400">Normal</p>
          </div>
        </Card>
      </div>

      {selectedCriticalDepot && (
        <ContainerSelectionModal
          depot={selectedCriticalDepot}
          open={!!selectedCriticalDepot}
          onOpenChange={(open) => !open && setSelectedCriticalDepot(null)}
        />
      )}
    </div>
  )
}

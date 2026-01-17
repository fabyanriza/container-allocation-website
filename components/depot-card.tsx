"use client"

import { Card } from "@/components/ui/card"

interface Depot {
  id: number
  name: string
  capacity_teu: number
  location: string
  used_teu: number
  available_teu: number
  usage_percentage: number
}

export default function DepotCard({ depot }: { depot: Depot }) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">{depot.name}</h3>
        <p className="text-xs text-muted-foreground">{depot.location}</p>
      </div>

      {/* Usage Bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Capacity</span>
          <span className="text-xs text-muted-foreground">{depot.usage_percentage.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${getProgressColor(depot.usage_percentage)}`}
            style={{ width: `${Math.min(depot.usage_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Capacity:</span>
          <span className="font-medium text-foreground">{depot.capacity_teu} TEU</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Used:</span>
          <span className="font-medium text-blue-600">{depot.used_teu.toFixed(1)} TEU</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Available:</span>
          <span className="font-medium text-green-600">{depot.available_teu.toFixed(1)} TEU</span>
        </div>
      </div>
    </Card>
  )
}

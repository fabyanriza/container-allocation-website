"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronUp } from "lucide-react"

interface Depot {
  id: number
  name: string
  capacity_teu: number
  location: string
  used_teu: number
  available_teu: number
  usage_percentage: number
  container_breakdown: {
    total: number
    grade_a: number
    grade_b: number
    grade_c: number
    empty: number
    full: number
  }
}

export default function DepotCard({ depot }: { depot: Depot }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  const toggleExpanded = () => setIsExpanded((prev) => !prev)

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={toggleExpanded}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggleExpanded()
        }
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{depot.name}</h3>
          <p className="text-xs text-muted-foreground">{depot.location}</p>
        </div>
        <div className="text-muted-foreground">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
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
        <div className="flex justify-between">
          <span className="text-muted-foreground">Containers:</span>
          <span className="font-medium text-foreground">{depot.container_breakdown.total}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t pt-3 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Container Grade</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-2 py-2 text-center">
                <p className="text-muted-foreground">Grade A</p>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">{depot.container_breakdown.grade_a}</p>
              </div>
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 px-2 py-2 text-center">
                <p className="text-muted-foreground">Grade B</p>
                <p className="font-semibold text-blue-700 dark:text-blue-300">{depot.container_breakdown.grade_b}</p>
              </div>
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 px-2 py-2 text-center">
                <p className="text-muted-foreground">Grade C</p>
                <p className="font-semibold text-amber-700 dark:text-amber-300">{depot.container_breakdown.grade_c}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Container Status</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-slate-50 dark:bg-slate-900 px-2 py-2 text-center">
                <p className="text-muted-foreground">Empty</p>
                <p className="font-semibold text-foreground">{depot.container_breakdown.empty}</p>
              </div>
              <div className="rounded-md bg-slate-50 dark:bg-slate-900 px-2 py-2 text-center">
                <p className="text-muted-foreground">Full</p>
                <p className="font-semibold text-foreground">{depot.container_breakdown.full}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

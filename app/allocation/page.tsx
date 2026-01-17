"use client"

import { useState } from "react"
import AllocationTransferForm from "@/components/allocation-transfer-form"
import AllocationHistory from "@/components/allocation-history"

export default function AllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAllocationSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Allocate Containers</h1>
          <p className="text-muted-foreground">Transfer containers between depots</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Allocation Form */}
          <AllocationTransferForm key={`form-${refreshKey}`} onSuccess={handleAllocationSuccess} />

          {/* History */}
          <AllocationHistory key={`history-${refreshKey}`} />
        </div>
      </div>
    </main>
  )
}

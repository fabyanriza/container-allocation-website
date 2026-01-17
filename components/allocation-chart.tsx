"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface Depot {
  id: number
  name: string
  capacity_teu: number
  used_teu: number
  available_teu: number
}

export default function AllocationChart({ depots }: { depots: Depot[] }) {
  const chartData = depots.map((depot) => ({
    name: depot.name.replace("Depo ", ""),
    Available: Math.round(depot.available_teu * 10) / 10,
    Used: Math.round(depot.used_teu * 10) / 10,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
        <YAxis stroke="var(--color-muted-foreground)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            color: "var(--color-foreground)",
          }}
        />
        <Legend />
        <Bar dataKey="Used" stackId="a" fill="var(--color-chart-1)" />
        <Bar dataKey="Available" stackId="a" fill="var(--color-chart-2)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config?: Record<string, { label: string; color: string }>
  }
>(({ className, config, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full h-full", className)}
    style={{
      "--chart-1": "hsl(12, 76%, 61%)",
      "--chart-2": "hsl(173, 58%, 39%)",
      "--chart-3": "hsl(197, 71%, 53%)",
      "--chart-4": "hsl(43, 74%, 66%)",
      "--chart-5": "hsl(27, 87%, 67%)",
    } as React.CSSProperties}
    {...props}
  />
))
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-background p-2 shadow-md",
      className
    )}
    {...props}
  />
))
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean
    payload?: any[]
    label?: string
  }
>(({ active, payload, label, className, ...props }, ref) => {
  if (!active || !payload) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn("grid min-w-[8rem] gap-1.5", className)}
      {...props}
    >
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      {payload.map((item: any, index: number) => (
        <div key={index} className="text-xs">
          <span style={{ color: item.color || "currentColor" }}>
            {item.name}: {item.value}
          </span>
        </div>
      ))}
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent }

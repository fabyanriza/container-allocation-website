import { ForecastEmptyContainers } from "@/components/forecast-empty-containers"

export default function ForecastPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        <ForecastEmptyContainers />
      </div>
    </div>
  )
}

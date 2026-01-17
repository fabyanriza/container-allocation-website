import { Card } from "@/components/ui/card"

export default function AllocationRecommendationInfo() {
  return (
    <Card className="p-6 border border-border max-w-3xl mb-6">
      <h3 className="text-xl font-bold mb-4 text-foreground">Logika Rekomendasi Alokasi</h3>

      <div className="space-y-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-700 dark:text-blue-300 font-bold text-xs">1</span>
          </div>
          <div>
            <p className="font-medium text-foreground">Aktivitas Luar + Logistic No</p>
            <p className="text-xs">Prioritas: Depo Yon → Alternatif: Japfa / Teluk Bayur</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-green-700 dark:text-green-300 font-bold text-xs">2</span>
          </div>
          <div>
            <p className="font-medium text-foreground">Aktivitas Luar + Logistic Yes</p>
            <p className="text-xs">Prioritas: Depo Yon → Alternatif: Depo 4 → Japfa / Teluk Bayur</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-purple-700 dark:text-purple-300 font-bold text-xs">3</span>
          </div>
          <div>
            <p className="font-medium text-foreground">Aktivitas Dalam + Logistic No</p>
            <p className="text-xs">Prioritas: Japfa / Teluk Bayur</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-orange-700 dark:text-orange-300 font-bold text-xs">4</span>
          </div>
          <div>
            <p className="font-medium text-foreground">Aktivitas Dalam + Logistic Yes</p>
            <p className="text-xs">Prioritas: Depo 4</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-muted rounded-md">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Catatan:</span> Sistem akan otomatis merekomendasikan depot berdasarkan jenis
          aktivitas dan kebutuhan logistik. Rekomendasi juga mempertimbangkan kapasitas tersedia di setiap depot.
        </p>
      </div>
    </Card>
  )
}

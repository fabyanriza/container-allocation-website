"use client";

import { EnhancedDashboard } from "@/components/enhanced-dashboard";
import DepotCard from "@/components/depot-card";
import CapacityAlerts from "@/components/capacity-alerts";
import { RebalancingAlerts } from "@/components/rebalancing-alerts";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Depot {
  id: number;
  name: string;
  capacity_teu: number;
  location: string;
}

interface DepotWithUsage extends Depot {
  used_teu: number;
  available_teu: number;
  usage_percentage: number;
}

type ContainerRow = { size_teu: number };

export default function Home() {
  const [depots, setDepots] = useState<DepotWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ string biar stabil & tidak bikin hydration mismatch
  const [lastUpdate, setLastUpdate] = useState<string>("—");

  const timeFormatter = useMemo(() => {
    return new Intl.DateTimeFormat("id-ID", {
      timeStyle: "medium",
      timeZone: "Asia/Jakarta",
    });
  }, []);

  useEffect(() => {
    fetchDepotData();
    const interval = setInterval(fetchDepotData, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDepotData() {
    try {
      const supabase = createClient();

      const { data: depotsData, error: depotsError } = await supabase
        .from("depots")
        .select("*")
        .order("name");

      if (depotsError) throw depotsError;

      if (depotsData) {
        const depotsTyped = depotsData as Depot[];

        const depotsWithUsage: DepotWithUsage[] = await Promise.all(
          depotsTyped.map(async (depot: Depot) => {
            const { data: containers, error: containerError } = await supabase
              .from("containers")
              .select("size_teu")
              .eq("depot_id", depot.id);

            if (containerError) throw containerError;

            // ✅ ketik hasil query containers tanpa .returns<T>()
            const containersTyped = (containers ?? []) as ContainerRow[];

            const used_teu = containersTyped.reduce(
              (sum: number, c: ContainerRow) => sum + c.size_teu,
              0
            );

            const available_teu = depot.capacity_teu - used_teu;
            const usage_percentage =
              depot.capacity_teu > 0
                ? (used_teu / depot.capacity_teu) * 100
                : 0;

            return { ...depot, used_teu, available_teu, usage_percentage };
          })
        );

        setDepots(depotsWithUsage);
        setLastUpdate(timeFormatter.format(new Date()));
      }
    } catch (err) {
      console.error("Error fetching depot data:", err);
      setError("Failed to load depot data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Container Allocation System
              </h1>
              <p className="text-muted-foreground">
                Monitor and manage container allocation across all depots
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Last updated</p>
              <p className="text-lg font-semibold text-foreground">
                {lastUpdate}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Enhanced Dashboard */}
        <div className="mb-8">
          <EnhancedDashboard />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <RebalancingAlerts />
            </div>

            <div className="mb-6">
              <CapacityAlerts depots={depots} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {depots.map((depot) => (
                <DepotCard key={depot.id} depot={depot} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

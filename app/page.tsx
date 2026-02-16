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
  container_breakdown: {
    total: number;
    grade_a: number;
    grade_b: number;
    grade_c: number;
    empty: number;
    full: number;
  };
}

type ContainerRow = {
  depot_id: number;
  size_teu: number;
  grade?: string | null;
  discharge_status?: string | null;
};

function normalizeContainerGrade(grade?: string | null): "A" | "B" | "C" | undefined {
  if (!grade) return undefined;
  const normalized = grade.trim().toUpperCase();
  if (normalized === "A" || normalized === "B" || normalized === "C") {
    return normalized;
  }
  return undefined;
}

function getContainerState(dischargeStatus?: string | null): "full" | "empty" | "unknown" {
  const raw = dischargeStatus?.trim().toLowerCase();
  if (!raw) return "unknown";
  if (raw.startsWith("f")) return "full";
  if (raw.startsWith("m")) return "empty";
  return "unknown";
}

export default function Home() {
  const [depots, setDepots] = useState<DepotWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("-");

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

        const { data: containers, error: containersError } = await supabase
          .from("containers")
          .select("depot_id, size_teu, grade, discharge_status");

        if (containersError) throw containersError;

        const containersTyped = (containers ?? []) as ContainerRow[];

        const depotsWithUsage: DepotWithUsage[] = depotsTyped.map((depot: Depot) => {
          const depotContainers = containersTyped.filter((c) => c.depot_id === depot.id);

          const used_teu = depotContainers.reduce(
            (sum: number, c: ContainerRow) => sum + c.size_teu,
            0,
          );

          const grade_a = depotContainers.filter((c) => normalizeContainerGrade(c.grade) === "A").length;
          const grade_b = depotContainers.filter((c) => normalizeContainerGrade(c.grade) === "B").length;
          const grade_c = depotContainers.filter((c) => normalizeContainerGrade(c.grade) === "C").length;
          const empty = depotContainers.filter((c) => getContainerState(c.discharge_status) === "empty").length;
          const full = depotContainers.filter((c) => getContainerState(c.discharge_status) === "full").length;

          const available_teu = depot.capacity_teu - used_teu;
          const usage_percentage = depot.capacity_teu > 0 ? (used_teu / depot.capacity_teu) * 100 : 0;

          return {
            ...depot,
            used_teu,
            available_teu,
            usage_percentage,
            container_breakdown: {
              total: depotContainers.length,
              grade_a,
              grade_b,
              grade_c,
              empty,
              full,
            },
          };
        });

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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <CapacityAlerts depots={depots} />
            </div>

            <div className="mb-6">
              <RebalancingAlerts />
            </div>

            <div className="mb-8">
              <EnhancedDashboard />
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

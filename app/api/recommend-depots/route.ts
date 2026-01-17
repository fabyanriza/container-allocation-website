import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type IncomingContainer = {
  container_number: string;
  activity: string;
  logistics: string;
  size_teu: number;
  depot_id?: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const containers: IncomingContainer[] = body?.containers ?? [];

    if (!Array.isArray(containers) || containers.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ✅ server only

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE env (URL or SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 },
      );
    }

    const supabase = createClient(url, serviceKey);

    const { data: depots, error: depotsError } = await supabase
      .from("depots")
      .select("id,name,capacity_teu");

    if (depotsError) throw depotsError;

    const { data: allContainers, error: contErr } = await supabase
      .from("containers")
      .select("depot_id,size_teu");

    if (contErr) throw contErr;

    const usedByDepot = new Map<number, number>();
    for (const c of allContainers ?? []) {
      const depotId = c.depot_id as number | null;
      const size = Number(c.size_teu ?? 0);
      if (!depotId) continue;
      usedByDepot.set(
        depotId,
        (usedByDepot.get(depotId) ?? 0) + (Number.isFinite(size) ? size : 0),
      );
    }

    // available map (mutable)
    const available = new Map<number, number>();
    for (const d of depots ?? []) {
      const used = usedByDepot.get(d.id) ?? 0;
      available.set(d.id, (d.capacity_teu ?? 0) - used);
    }

    // choose depot for each incoming container
    const recommendations = containers.map((c, index) => {
      const size = Number(c.size_teu ?? 1) || 1;

      // urut depot by available desc
      const sorted = (depots ?? [])
        .map((d) => ({
          id: d.id,
          name: d.name,
          avail: available.get(d.id) ?? 0,
        }))
        .sort((a, b) => b.avail - a.avail);

      const pick = sorted.find((d) => d.avail >= size) ?? sorted[0]; // fallback

      if (!pick) {
        return {
          index,
          recommended_depot_id: null,
          reason: "No depots available",
        };
      }

      // reserve in memory
      available.set(pick.id, (available.get(pick.id) ?? 0) - size);

      return {
        index,
        recommended_depot_id: pick.id,
        reason: `Recommended based on current available capacity (fits ${size} TEU)`,
      };
    });

    return NextResponse.json({ recommendations });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Recommendation error" },
      { status: 500 },
    );
  }
}

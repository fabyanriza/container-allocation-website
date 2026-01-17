import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "crypto";

export const runtime = "nodejs";

type IncomingContainer = {
  container_number: string;
  activity: string;
  logistics: string; // "yes"/"no" (atau variasi)
  size_teu: number;
  depot_id?: number;
};

type DepotRow = {
  id: number;
  name: string;
  capacity_teu: number;
};

function norm(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function isYes(v: unknown) {
  const x = norm(v);
  return x === "yes" || x === "y" || x === "true" || x === "1";
}

function isNo(v: unknown) {
  const x = norm(v);
  return x === "no" || x === "n" || x === "false" || x === "0";
}

function isOutsideActivity(activity: unknown) {
  const a = norm(activity);
  return (
    a.includes("luar") && (a.includes("stuffing") || a.includes("stripping"))
  );
}

function isInsideActivity(activity: unknown) {
  const a = norm(activity);
  return (
    a.includes("dalam") && (a.includes("stuffing") || a.includes("stripping"))
  );
}

function findDepotIdByKeywords(depots: DepotRow[], keywords: string[]) {
  // match: depot.name includes any keyword, choose first match
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const found = depots.find((d) =>
    lowerKeywords.some((k) => d.name.toLowerCase().includes(k)),
  );
  return found?.id ?? null;
}

function usageAfterAddPercent(
  capacity: number,
  available: number,
  addTeu: number,
) {
  if (!capacity || capacity <= 0) return 100;
  const usedNow = capacity - available;
  const usedAfter = usedNow + addTeu;
  return (usedAfter / capacity) * 100;
}

function isOver90(capacity: number, available: number, addTeu: number) {
  return usageAfterAddPercent(capacity, available, addTeu) >= 90;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const containers: IncomingContainer[] = body?.containers ?? [];

    if (!Array.isArray(containers) || containers.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // server only

    if (!url || !serviceKey) {
      return NextResponse.json(
        {
          error:
            "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(url, serviceKey);

    // depots
    const { data: depotsRaw, error: depotsError } = await supabase
      .from("depots")
      .select("id,name,capacity_teu");

    if (depotsError) throw depotsError;

    const depots: DepotRow[] = (depotsRaw as DepotRow[]) ?? [];

    // containers existing to compute usage
    const { data: existingContainers, error: contErr } = await supabase
      .from("containers")
      .select("depot_id,size_teu");

    if (contErr) throw contErr;

    // used TEU per depot
    const usedByDepot = new Map<number, number>();
    for (const c of existingContainers ?? []) {
      const depotId = c.depot_id as number | null;
      const size = Number(c.size_teu ?? 0);
      if (!depotId) continue;
      usedByDepot.set(
        depotId,
        (usedByDepot.get(depotId) ?? 0) + (Number.isFinite(size) ? size : 0),
      );
    }

    // mutable availability map (supaya rekomendasi tidak numpuk di depot yang sama)
    const available = new Map<number, number>();
    const capacity = new Map<number, number>();
    for (const d of depots) {
      capacity.set(d.id, Number(d.capacity_teu ?? 0));
      const used = usedByDepot.get(d.id) ?? 0;
      available.set(d.id, Number(d.capacity_teu ?? 0) - used);
    }

    // helper: pick preferred chain with rules + capacity + <90%
    function pickFromPreferredChain(
      preferredIds: number[],
      size: number,
    ): { id: number | null; reason: string } {
      // 1) try preferred that fits and NOT over 90 after add
      for (const id of preferredIds) {
        const cap = capacity.get(id) ?? 0;
        const av = available.get(id) ?? 0;
        if (av >= size && !isOver90(cap, av, size)) {
          return {
            id,
            reason: "Preferred depot fits and remains <90% after allocation",
          };
        }
      }

      // 2) if all preferred are >=90, pick random among other depots (<90 and fits)
      const candidates = depots
        .map((d) => {
          const cap = capacity.get(d.id) ?? 0;
          const av = available.get(d.id) ?? 0;
          return { id: d.id, cap, av };
        })
        .filter((x) => x.av >= size && !isOver90(x.cap, x.av, size));

      if (candidates.length > 0) {
        const chosen = candidates[randomInt(0, candidates.length)];
        return {
          id: chosen.id,
          reason:
            "Rule 4: preferred depots >=90%, random to another depot (<90%)",
        };
      }

      // 3) fallback: any depot that fits (even if >=90), choose max availability
      const fallback = depots
        .map((d) => ({ id: d.id, av: available.get(d.id) ?? 0 }))
        .filter((x) => x.av >= size)
        .sort((a, b) => b.av - a.av)[0];

      if (fallback) {
        return {
          id: fallback.id,
          reason:
            "Fallback: no depot <90% fits; chose depot with highest available",
        };
      }

      // 4) none fits
      return {
        id: null,
        reason: "No depots have enough capacity for this container",
      };
    }

    // prepare keyword-based ids
    const yonId = findDepotIdByKeywords(depots, ["yon"]);
    const japfaId = findDepotIdByKeywords(depots, ["japfa"]);
    const telukBayurId = findDepotIdByKeywords(depots, [
      "teluk bayur",
      "telukbayur",
    ]);
    const depo4Id = findDepotIdByKeywords(depots, [
      "depo 4",
      "depo4",
      "depot 4",
      "depot4",
    ]);

    const recommendations = containers.map((c, index) => {
      const size = Number(c.size_teu ?? 1) || 1;

      // Decide rule group
      const outside = isOutsideActivity(c.activity);
      const inside = isInsideActivity(c.activity);
      const logYes = isYes(c.logistics);
      const logNo = isNo(c.logistics);

      let preferred: number[] = [];
      let ruleLabel = "";

      // Rule 1
      if (outside && logNo) {
        ruleLabel = "Rule 1";
        preferred = [yonId, japfaId, telukBayurId].filter(Boolean) as number[];
      }
      // Rule 2
      else if (inside && logNo) {
        ruleLabel = "Rule 2";
        preferred = [japfaId, telukBayurId].filter(Boolean) as number[];
      }
      // Rule 3
      else if (inside && logYes) {
        ruleLabel = "Rule 3";
        preferred = [depo4Id].filter(Boolean) as number[];
      }
      // default (kalau activity/logistics tidak match persis)
      else {
        ruleLabel = "Default";
        preferred = depots
          .map((d) => ({ id: d.id, av: available.get(d.id) ?? 0 }))
          .sort((a, b) => b.av - a.av)
          .slice(0, 3)
          .map((x) => x.id);
      }

      const picked = pickFromPreferredChain(preferred, size);

      // reserve capacity in-memory
      if (picked.id != null) {
        available.set(picked.id, (available.get(picked.id) ?? 0) - size);
      }

      return {
        index,
        recommended_depot_id: picked.id,
        reason: `${ruleLabel}: ${picked.reason}`,
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

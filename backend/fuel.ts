export type NationalFuelPrice = {
  fuel: "e10";
  avg: number;
  min: number;
  max: number;
  /** Absolute €/L change over ~1 day (negative = cheaper). */
  trend1d: number;
  computedAt: string | null;
};

type MppcNationalResponse = {
  data?: {
    fuelType?: string;
    avgPrice1d?: string;
    minPrice1d?: string;
    maxPrice1d?: string;
    trend1d?: string;
    computedAt?: string;
  };
};

const MPPC_NATIONAL =
  "https://developer.monpleinpascher.com/api/v1/prices/national?fuel=e10";

function parseEuro(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * National E10 average from Mon Plein Pas Cher (official FR open data).
 * Cached ~30 min — fuel prices barely move minute-to-minute.
 */
export async function getNationalE10Price(): Promise<NationalFuelPrice | null> {
  try {
    const res = await fetch(MPPC_NATIONAL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "harbi.eu/1.0 (personal status banner)",
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as MppcNationalResponse;
    const data = json.data;
    const avg = parseEuro(data?.avgPrice1d);
    const min = parseEuro(data?.minPrice1d);
    const max = parseEuro(data?.maxPrice1d);
    const trend1d = parseEuro(data?.trend1d);
    if (avg == null || min == null || max == null || trend1d == null) {
      return null;
    }

    return {
      fuel: "e10",
      avg,
      min,
      max,
      trend1d,
      computedAt: data?.computedAt ?? null,
    };
  } catch {
    return null;
  }
}

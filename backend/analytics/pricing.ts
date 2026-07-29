/** Approximate Anthropic list prices USD per 1M tokens (update as needed). */
export type ModelPricing = {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheWritePerMTok: number;
  cacheReadPerMTok: number;
};

const DEFAULT_PRICING: ModelPricing = {
  inputPerMTok: 3,
  outputPerMTok: 15,
  cacheWritePerMTok: 3.75,
  cacheReadPerMTok: 0.3,
};

/** Rough pricing keyed by model id substring match (longest match wins). */
const PRICING_TABLE: { match: string; pricing: ModelPricing }[] = [
  {
    match: "haiku",
    pricing: {
      inputPerMTok: 1,
      outputPerMTok: 5,
      cacheWritePerMTok: 1.25,
      cacheReadPerMTok: 0.1,
    },
  },
  {
    match: "sonnet-4",
    pricing: {
      inputPerMTok: 3,
      outputPerMTok: 15,
      cacheWritePerMTok: 3.75,
      cacheReadPerMTok: 0.3,
    },
  },
  {
    match: "sonnet-5",
    pricing: {
      inputPerMTok: 3,
      outputPerMTok: 15,
      cacheWritePerMTok: 3.75,
      cacheReadPerMTok: 0.3,
    },
  },
  {
    match: "opus-4",
    pricing: {
      inputPerMTok: 15,
      outputPerMTok: 75,
      cacheWritePerMTok: 18.75,
      cacheReadPerMTok: 1.5,
    },
  },
  {
    match: "opus-5",
    pricing: {
      inputPerMTok: 15,
      outputPerMTok: 75,
      cacheWritePerMTok: 18.75,
      cacheReadPerMTok: 1.5,
    },
  },
];

export function pricingForModel(model: string): ModelPricing {
  const lower = model.toLowerCase();
  let best: ModelPricing | null = null;
  let bestLen = 0;
  for (const row of PRICING_TABLE) {
    if (lower.includes(row.match) && row.match.length >= bestLen) {
      best = row.pricing;
      bestLen = row.match.length;
    }
  }
  return best ?? DEFAULT_PRICING;
}

export function estimateCostUsd(input: {
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheCreationTokens?: number | null;
  cacheReadTokens?: number | null;
}): number {
  const p = pricingForModel(input.model);
  const inTok = input.inputTokens ?? 0;
  const outTok = input.outputTokens ?? 0;
  const cacheWrite = input.cacheCreationTokens ?? 0;
  const cacheRead = input.cacheReadTokens ?? 0;
  // Non-cache input ≈ input_tokens - cache_read (API reports input including cache reads depending on version)
  // Conservative: bill input at input rate + cache read at read rate + cache write at write rate + output
  return (
    (inTok / 1_000_000) * p.inputPerMTok +
    (outTok / 1_000_000) * p.outputPerMTok +
    (cacheWrite / 1_000_000) * p.cacheWritePerMTok +
    (cacheRead / 1_000_000) * p.cacheReadPerMTok
  );
}

/** What cache reads would have cost at full input rate, minus actual cache-read rate. */
export function estimateCacheSavingsUsd(input: {
  model: string;
  cacheReadTokens?: number | null;
}): number {
  const p = pricingForModel(input.model);
  const read = input.cacheReadTokens ?? 0;
  if (read <= 0) return 0;
  return (read / 1_000_000) * (p.inputPerMTok - p.cacheReadPerMTok);
}

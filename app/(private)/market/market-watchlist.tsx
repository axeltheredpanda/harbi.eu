"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/backend/market";

function formatPrice(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function changeClass(value: number | null): string {
  if (value == null || value === 0) return "text-ink-faint";
  // Warm palette: up = terracotta accent, down = muted ink (no neon green/red)
  return value > 0 ? "text-accent" : "text-ink-muted";
}

export function MarketWatchlist() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/market");
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed to load");
        if (!cancelled) {
          setQuotes(body.quotes ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-sm text-accent">~/market</p>
        <h1 className="mt-1 font-display text-2xl font-medium text-ink">Watchlist</h1>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">
          A short US tech list. Prices refresh about every five minutes — informational
          only.
        </p>
      </div>

      {loading && (
        <p className="font-mono text-xs text-ink-faint">loading quotes…</p>
      )}
      {error && (
        <p className="font-mono text-xs text-ink-muted">{error}</p>
      )}

      <ul className="divide-y divide-border border-t border-border">
        {quotes.map((quote) => (
          <li
            key={quote.symbol}
            className="flex items-baseline justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-mono text-sm text-ink">{quote.symbol}</p>
              <p className="truncate text-xs text-ink-faint">{quote.name}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-ink">{formatPrice(quote.price)}</p>
              <p className={`font-mono text-xs ${changeClass(quote.changePercent)}`}>
                {quote.changePercent == null
                  ? "—"
                  : `${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

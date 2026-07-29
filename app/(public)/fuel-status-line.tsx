"use client";

import type { NationalFuelPrice } from "@/backend/fuel";
import type { Locale } from "@/frontend/i18n/landing";

type Props = {
  price: NationalFuelPrice;
  locale: Locale;
  label: string;
  unit: string;
  rangeLabel: string;
  trendLabel: string;
};

function formatEuro(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function trendMeta(trend: number, locale: string) {
  const abs = Math.abs(trend);
  const formatted = formatEuro(abs, locale);
  if (trend < -0.0005) {
    return {
      arrow: "↓",
      signed: `−${formatted}`,
      // Cheaper fuel = calm; warmer accent reserved for rises
      className: "text-ink-muted",
      direction: "down" as const,
    };
  }
  if (trend > 0.0005) {
    return {
      arrow: "↑",
      signed: `+${formatted}`,
      className: "text-accent",
      direction: "up" as const,
    };
  }
  return {
    arrow: "→",
    signed: formatEuro(0, locale),
    className: "text-ink-faint",
    direction: "flat" as const,
  };
}

/**
 * Mono ticker line for the public banner — national E10 avg, 1d trend, min–max.
 * Keeps the same voice as the Red Bull / relationship lines (no cards).
 */
export function FuelStatusLine({
  price,
  locale,
  label,
  unit,
  rangeLabel,
  trendLabel,
}: Props) {
  const numberLocale = locale === "fr" ? "fr-FR" : "en-GB";
  const avg = formatEuro(price.avg, numberLocale);
  const min = formatEuro(price.min, numberLocale);
  const max = formatEuro(price.max, numberLocale);
  const trend = trendMeta(price.trend1d, numberLocale);
  const title = [
    `${label} ${avg} ${unit}`,
    `${trendLabel} ${trend.arrow} ${trend.signed} ${unit}`,
    `${rangeLabel} ${min}–${max} ${unit}`,
    price.computedAt ? `source ${price.computedAt}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <p
      className="fuel-ticker text-ink-muted"
      title={title}
      aria-label={title}
    >
      <span className="text-ink">{label}</span>
      <span className="text-ink-faint" aria-hidden="true">
        {" · "}
      </span>
      <span className="inline-block tabular-nums text-ink">{avg}</span>
      <span className="text-ink-faint"> {unit}</span>
      <span className="text-ink-faint" aria-hidden="true">
        {" · "}
      </span>
      <span className={`inline-flex items-baseline gap-1 tabular-nums ${trend.className}`}>
        <span aria-hidden="true" className="fuel-trend-arrow inline-block">
          {trend.arrow}
        </span>
        <span>
          {trend.signed}
          <span className="text-ink-faint"> {trendLabel}</span>
        </span>
      </span>
      <span className="text-ink-faint" aria-hidden="true">
        {" · "}
      </span>
      <span className="tabular-nums text-ink-faint">
        {min}–{max}
      </span>
    </p>
  );
}

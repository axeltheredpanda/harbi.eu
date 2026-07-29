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
      className: "text-ink-muted",
    };
  }
  if (trend > 0.0005) {
    return {
      arrow: "↑",
      signed: `+${formatted}`,
      className: "text-accent",
    };
  }
  return {
    arrow: "→",
    signed: formatEuro(0, locale),
    className: "text-ink-faint",
  };
}

/**
 * Compact fuel metric for the asymmetric status rail.
 * Min–max live in the tooltip so the strip stays scannable.
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
    `${label} France ${avg} ${unit}`,
    `${trendLabel} ${trend.arrow} ${trend.signed} ${unit}`,
    `${rangeLabel} ${min}–${max} ${unit}`,
    price.computedAt ? `source ${price.computedAt}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <p
      className="fuel-ticker inline-flex flex-wrap items-baseline gap-x-1.5 text-ink-muted"
      title={title}
      aria-label={title}
    >
      <span className="text-ink-faint">{label}</span>
      <span className="tabular-nums text-ink">{avg}</span>
      <span className="text-ink-faint">{unit}</span>
      <span
        className={`inline-flex items-baseline gap-0.5 tabular-nums ${trend.className}`}
      >
        <span aria-hidden="true" className="fuel-trend-arrow inline-block">
          {trend.arrow}
        </span>
        <span>{trend.signed}</span>
      </span>
    </p>
  );
}

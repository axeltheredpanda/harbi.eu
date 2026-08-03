import type { CSSProperties } from "react";

type Props = {
  className?: string;
  /** Number of placeholder rows / blocks. */
  lines?: number;
  /** Optional fixed height for a hero/chart block. */
  block?: boolean;
  /** Accessible label while content loads. */
  label?: string;
  style?: CSSProperties;
};

/**
 * Editorial skeleton — cream tones slightly darker than canvas.
 * Use for any async surface (notes, analytics, news, convert, CV, today).
 */
export function Skeleton({
  className = "",
  lines = 3,
  block = false,
  label = "Loading",
  style,
}: Props) {
  if (block) {
    return (
      <div
        className={`skeleton-block animate-pulse rounded-sm bg-surface ${className}`}
        style={style}
        role="status"
        aria-busy="true"
        aria-label={label}
      />
    );
  }

  return (
    <div
      className={`space-y-3 ${className}`}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line h-3 rounded-sm bg-surface"
          style={{
            width: `${Math.max(38, 92 - i * 14)}%`,
            ...style,
          }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`space-y-3 rounded-sm border border-border/70 bg-surface/60 p-4 ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-3 w-24 rounded-sm bg-surface-hover" />
      <div className="h-8 w-2/3 max-w-xs rounded-sm bg-surface-hover" />
      <div className="h-3 w-full rounded-sm bg-surface-hover" />
      <div className="h-3 w-4/5 rounded-sm bg-surface-hover" />
    </div>
  );
}

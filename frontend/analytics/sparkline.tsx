type Props = {
  values: number[];
  className?: string;
  /** Accessible label */
  label?: string;
  /**
   * Optional axis labels under each point. Use `null` / `""` to keep spacing
   * without drawing a tick (e.g. hours 0 4 8 12 16 20 only).
   */
  axisLabels?: (string | null)[];
};

/** Thin terracotta sparkline on cream - no grid, no legend. */
export function Sparkline({
  values,
  className = "",
  label,
  axisLabels,
}: Props) {
  const width = 240;
  const height = 36;
  const pad = 2;

  const empty = !values.length || values.every((v) => v === 0);

  let chart: JSX.Element;
  if (empty) {
    chart = (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full text-border ${className}`}
        role="img"
        aria-label={label ?? "No data"}
      >
        <line
          x1={pad}
          y1={height / 2}
          x2={width - pad}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    );
  } else {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);
    const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;

    const points = values
      .map((v, i) => {
        const x = pad + i * step;
        const y = height - pad - ((v - min) / span) * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    chart = (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full text-accent ${className}`}
        role="img"
        aria-label={label}
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    );
  }

  const labels =
    axisLabels && axisLabels.length === values.length ? axisLabels : null;

  return (
    <div className="w-full max-w-sm">
      {chart}
      {labels ? (
        <div
          className="mt-1 flex font-mono text-[10px] tabular-nums text-ink-faint"
          aria-hidden="true"
        >
          {labels.map((tick, i) => (
            <span
              key={i}
              className="min-w-0 flex-1 text-center first:text-left last:text-right"
            >
              {tick ?? ""}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

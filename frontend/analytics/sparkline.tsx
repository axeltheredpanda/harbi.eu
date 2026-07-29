type Props = {
  values: number[];
  className?: string;
  /** Accessible label */
  label?: string;
};

/** Thin terracotta sparkline on cream — no grid, no legend. */
export function Sparkline({ values, className = "", label }: Props) {
  const width = 240;
  const height = 36;
  const pad = 2;

  if (!values.length || values.every((v) => v === 0)) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full max-w-sm text-border ${className}`}
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
  }

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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full max-w-sm text-accent ${className}`}
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

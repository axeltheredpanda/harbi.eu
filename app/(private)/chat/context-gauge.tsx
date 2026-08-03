type Props = {
  usedTokens: number;
  limitTokens?: number;
};

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function ContextGauge({ usedTokens, limitTokens = 200_000 }: Props) {
  const usage = clamp(usedTokens / Math.max(1, limitTokens));
  const percent = Math.round(usage * 100);
  const warm = usage > 0.75;

  return (
    <div
      className="min-w-[8rem] space-y-1"
      title={`${usedTokens.toLocaleString()} of ${limitTokens.toLocaleString()} context tokens`}
    >
      <div className="flex items-center justify-between gap-3 font-mono text-[10px] tracking-wide text-ink-faint">
        <span>context</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-surface-hover"
        role="meter"
        aria-label="Context usage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-300 ${
            warm ? "bg-accent" : "bg-ink-faint/45"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="sr-only">context · {percent}%</p>
    </div>
  );
}

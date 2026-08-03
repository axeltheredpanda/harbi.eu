type Props = {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
};

export function BranchNav({
  index,
  count,
  onPrev,
  onNext,
  disabled = false,
}: Props) {
  if (count <= 1) return null;

  const current = Math.min(Math.max(index, 0), count - 1) + 1;
  const baseButton =
    "inline-flex h-6 w-6 items-center justify-center rounded-sm text-ink-faint transition-[background-color,color,opacity] duration-150 hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-35";

  return (
    <nav
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-canvas/80 px-1 py-0.5 font-mono text-[10px] text-ink-faint"
      aria-label="Message branches"
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled || current <= 1}
        className={baseButton}
        aria-label="Previous branch"
      >
        ←
      </button>
      <span className="min-w-[2.5rem] text-center tabular-nums">
        {current}/{count}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled || current >= count}
        className={baseButton}
        aria-label="Next branch"
      >
        →
      </button>
    </nav>
  );
}

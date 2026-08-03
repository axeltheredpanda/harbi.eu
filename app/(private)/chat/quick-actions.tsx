type Props = {
  disabled: boolean;
  onSummarize: () => void;
  onSaveAsNote: () => void;
  onOpenCanvas?: () => void;
};

export function QuickActions({
  disabled,
  onSummarize,
  onSaveAsNote,
  onOpenCanvas,
}: Props) {
  const className =
    "rounded-sm border border-border/70 px-2 py-1 font-mono text-[10px] tracking-wide text-ink-faint transition-[border-color,background-color,color] duration-150 hover:border-accent/40 hover:bg-accent-soft/60 hover:text-accent disabled:pointer-events-none disabled:opacity-40";

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={onSummarize}
        className={className}
      >
        summarize thread
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSaveAsNote}
        className={className}
      >
        save as note
      </button>
      {onOpenCanvas ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onOpenCanvas}
          className={className}
        >
          open canvas
        </button>
      ) : null}
    </span>
  );
}

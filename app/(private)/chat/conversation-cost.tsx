import { formatQuietCostUsd } from "@/frontend/chat/format-cost";

type Props = {
  totalCostUsd: number | null | undefined;
  inputTokens?: number;
  outputTokens?: number;
};

function formatTokens(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return null;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return value.toLocaleString();
}

export function ConversationCost({
  totalCostUsd,
  inputTokens,
  outputTokens,
}: Props) {
  const cost = formatQuietCostUsd(totalCostUsd);
  const input = formatTokens(inputTokens);
  const output = formatTokens(outputTokens);

  if (!cost && !input && !output) return null;

  return (
    <p
      className="font-mono text-[10px] tracking-wide text-ink-faint/80"
      title="Estimated conversation usage"
    >
      {cost ? <span className="tabular-nums">{cost}</span> : null}
      {input || output ? (
        <span className={cost ? "ml-2" : ""}>
          {input ? `${input} in` : null}
          {input && output ? " · " : null}
          {output ? `${output} out` : null}
        </span>
      ) : null}
    </p>
  );
}

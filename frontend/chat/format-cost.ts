/** Format estimated USD cost for a discreet Claudette footer. */
export function formatQuietCostUsd(cost: number | null | undefined): string | null {
  if (cost == null || !Number.isFinite(cost) || cost <= 0) return null;
  if (cost < 0.001) return "<$0.001";
  if (cost < 0.01) return `~$${cost.toFixed(3)}`;
  if (cost < 1) return `~$${cost.toFixed(2)}`;
  return `~$${cost.toFixed(2)}`;
}

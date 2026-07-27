type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium font-display transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-canvas hover:bg-accent-strong",
  secondary: "border border-border text-ink hover:bg-surface-hover",
  ghost: "text-ink-muted hover:text-ink",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return [base, variants[variant], className].filter(Boolean).join(" ");
}

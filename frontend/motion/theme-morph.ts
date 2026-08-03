import anime from "animejs";
import { EASE_SETTLE } from "./easing";
import { prefersReducedMotion } from "./prefers-reduced";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function lerpColor(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

const EDITORIAL = {
  "--color-canvas": "#faf6f0",
  "--color-surface": "#f3ede4",
  "--color-surface-hover": "#ebe3d7",
  "--color-border": "#ddd0c0",
  "--color-ink": "#1c1916",
  "--color-ink-muted": "#5c534a",
  "--color-ink-faint": "#8a8075",
  "--color-accent": "#9a4e2c",
  "--color-accent-strong": "#7a3b20",
  "--color-accent-soft": "#f2e4d8",
} as const;

const RALLY = {
  "--color-canvas": "#f3eee4",
  "--color-surface": "#e8e0d2",
  "--color-surface-hover": "#ddd4c3",
  "--color-border": "#c4b49a",
  "--color-ink": "#14110e",
  "--color-ink-muted": "#4a433a",
  "--color-ink-faint": "#7a7164",
  "--color-accent": "#c8102e",
  "--color-accent-strong": "#8f0b20",
  "--color-accent-soft": "#f3d4d8",
} as const;

/** Smoothly morph CSS color tokens between editorial and rally palettes. */
export function morphTheme(toRally: boolean): Promise<void> {
  const root = document.documentElement;
  const fromPalette = toRally ? EDITORIAL : RALLY;
  const toPalette = toRally ? RALLY : EDITORIAL;
  const keys = Object.keys(toPalette) as (keyof typeof EDITORIAL)[];

  if (prefersReducedMotion()) {
    if (toRally) {
      root.dataset.theme = "rally";
    } else {
      delete root.dataset.theme;
    }
    for (const key of keys) root.style.removeProperty(key);
    return Promise.resolve();
  }

  // Start from explicit colors so interpolation is stable
  for (const key of keys) {
    root.style.setProperty(key, fromPalette[key]);
  }
  if (toRally) root.dataset.theme = "rally";

  const state = { t: 0 };
  return new Promise((resolve) => {
    anime({
      targets: state,
      t: 1,
      duration: 720,
      easing: EASE_SETTLE,
      update() {
        for (const key of keys) {
          root.style.setProperty(
            key,
            lerpColor(fromPalette[key], toPalette[key], state.t),
          );
        }
      },
      complete() {
        if (!toRally) delete root.dataset.theme;
        for (const key of keys) root.style.removeProperty(key);
        resolve();
      },
    });
  });
}

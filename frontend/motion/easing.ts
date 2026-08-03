/**
 * Shared anime.js / CSS motion system — import everywhere.
 * Never hardcode easing strings in components.
 *
 * Convention (see CLAUDE.md): all new UI motion must use these curves
 * and helpers rather than one-off tunings.
 */

/** Soft decelerate — content appearing / fading in / page settles. */
export const EASE_SETTLE = "cubicBezier(0.22, 1, 0.36, 1)";

/** Light overshoot then stabilize — buttons, toggles, floating UI. */
export const EASE_SPRING = "easeOutElastic(1, 0.55)";

/** Faster / sharper — error & alert flinches only. */
export const EASE_ALERT = "easeOutBack";

/** CSS cubic-bezier equivalents for View Transitions / keyframes. */
export const CSS_EASE_SETTLE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const CSS_EASE_SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
export const CSS_EASE_ALERT = "cubic-bezier(0.34, 1.3, 0.64, 1)";

export const MOTION = {
  settle: {
    easing: EASE_SETTLE,
    duration: 420,
  },
  spring: {
    easing: EASE_SPRING,
    duration: 620,
  },
  alert: {
    easing: EASE_ALERT,
    duration: 280,
  },
  /** Press squash on interactive controls. */
  squash: {
    downScale: 0.97,
    downDuration: 90,
    upDuration: 280,
    downEasing: "easeOutQuad",
    upEasing: EASE_SPRING,
  },
  /** Route / panel page-turn (fade + few-px shift). */
  pageTurn: {
    durationMs: 380,
    offsetPx: 8,
    easing: EASE_SETTLE,
    cssEasing: CSS_EASE_SETTLE,
  },
  /** Stagger between hover action icons (ms). */
  actionStaggerMs: 36,
  /** Streaming cursor opacity loop (ms). */
  cursorPulseMs: 1200,
  /** Copy check hold before morph-back (ms). */
  copyHoldMs: 1500,
} as const;

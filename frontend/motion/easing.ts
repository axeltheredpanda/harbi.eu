/**
 * Shared anime.js easing curves for Claudette (and site motion).
 * Import these — never hardcode easing strings per component.
 */

/** Soft decelerate — content appearing / fading in. */
export const EASE_SETTLE = "cubicBezier(0.22, 1, 0.36, 1)";

/** Light overshoot then stabilize — buttons, toggles, floating UI. */
export const EASE_SPRING = "easeOutElastic(1, 0.55)";

/** Faster / sharper — error & alert flinches only. */
export const EASE_ALERT = "easeOutBack";

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
  /** Stagger between hover action icons (ms). */
  actionStaggerMs: 36,
  /** Streaming cursor opacity loop (ms). */
  cursorPulseMs: 1200,
  /** Copy check hold before morph-back (ms). */
  copyHoldMs: 1500,
} as const;

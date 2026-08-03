"use client";

import { useEffect, useRef } from "react";
import anime from "animejs";
import { EASE_SETTLE } from "./easing";
import { prefersReducedMotion } from "./prefers-reduced";

type Props = {
  value: number;
  locale: string;
  className?: string;
};

/** Count to target without layout shift - tabular nums + reserved width. */
export function CountUp({ value, locale, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(false);
  const formatted = value.toLocaleString(locale);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion() || value <= 0) {
      el.textContent = formatted;
      shown.current = true;
      return;
    }

    const from = shown.current
      ? Number(el.textContent?.replace(/\D/g, "") || 0)
      : 0;
    shown.current = true;
    const state = { n: from };
    const anim = anime({
      targets: state,
      n: value,
      duration: Math.min(900, 280 + Math.abs(value - from) * 4),
      easing: EASE_SETTLE,
      update() {
        el.textContent = Math.round(state.n).toLocaleString(locale);
      },
    });
    return () => anim.pause();
  }, [value, locale, formatted]);

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums ${className ?? ""}`}
      style={{ minWidth: `${Math.max(formatted.length, 1)}ch` }}
    >
      {formatted}
    </span>
  );
}

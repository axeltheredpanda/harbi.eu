"use client";

import { useEffect, useRef } from "react";
import anime from "animejs";
import { prefersReducedMotion } from "./prefers-reduced";

type Props = {
  value: number;
  locale: string;
  className?: string;
};

/** Count from 0 to target with anime.js on first mount / value jump. */
export function CountUp({ value, locale, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion() || value <= 0) {
      el.textContent = value.toLocaleString(locale);
      shown.current = true;
      return;
    }

    const from = shown.current ? Number(el.textContent?.replace(/\D/g, "") || 0) : 0;
    shown.current = true;
    const state = { n: from };
    const anim = anime({
      targets: state,
      n: value,
      duration: Math.min(900, 280 + Math.abs(value - from) * 4),
      easing: "easeOutExpo",
      update() {
        el.textContent = Math.round(state.n).toLocaleString(locale);
      },
    });
    return () => anim.pause();
  }, [value, locale]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import anime from "animejs";
import { prefersReducedMotion } from "./prefers-reduced";

type Props = {
  text: string;
  className?: string;
  onActivate?: () => void;
  "aria-label"?: string;
};

/** Editorial letter-assemble for the hero name. */
export function HeroAssemble({ text, className, onActivate, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const letters = el.querySelectorAll<HTMLElement>(".hero-letter");
    if (prefersReducedMotion()) {
      letters.forEach((n) => {
        n.style.opacity = "1";
        n.style.transform = "none";
      });
      return;
    }

    anime.set(letters, { opacity: 0, translateY: 10 });
    anime({
      targets: letters,
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 420,
      delay: anime.stagger(28, { start: 80 }),
      easing: "easeOutCubic",
    });
  }, [text]);

  const nodes: ReactNode[] = [];
  for (const ch of text) {
    if (ch === " ") {
      nodes.push(
        <span key={`sp-${nodes.length}`} className="inline-block w-[0.28em]">
          {" "}
        </span>,
      );
    } else {
      nodes.push(
        <span
          key={`${ch}-${nodes.length}`}
          className="hero-letter inline-block will-change-transform"
          style={{ opacity: 0 }}
        >
          {ch}
        </span>,
      );
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onActivate}
      className={className}
      {...rest}
    >
      {nodes}
    </button>
  );
}

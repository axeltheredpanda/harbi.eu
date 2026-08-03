"use client";

import {
  useEffect,
  useRef,
  type ElementType,
  type ReactNode,
} from "react";
import anime from "animejs";
import { EASE_SETTLE, MOTION } from "./easing";
import { prefersReducedMotion } from "./prefers-reduced";

type Props = {
  children: ReactNode;
  className?: string;
  /** Stagger delay between children in ms */
  stagger?: number;
  selector?: string;
  /** Semantic wrapper - use `ul` when children are `li` */
  as?: ElementType;
};

/** Fade/slide children into view with staggered anime.js reveals. */
export function ScrollReveal({
  children,
  className,
  stagger = 70,
  selector = ":scope > *",
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (items.length === 0) return;

    if (prefersReducedMotion()) {
      items.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    items.forEach((el) => {
      // Opacity/transform only - never remove from flow (avoids CLS)
      el.style.opacity = "0";
      el.style.transform = "translateY(12px)";
      el.style.willChange = "opacity, transform";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const index = items.indexOf(target);
          observer.unobserve(target);
          anime({
            targets: target,
            opacity: [0, 1],
            translateY: [12, 0],
            duration: MOTION.settle.duration + 100,
            delay: Math.max(0, index) * stagger,
            easing: EASE_SETTLE,
          });
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [selector, stagger]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

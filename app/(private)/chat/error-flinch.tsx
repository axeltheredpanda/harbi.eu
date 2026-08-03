"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EASE_ALERT, MOTION } from "@/frontend/motion/easing";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";
import { animate, anime } from "@/frontend/chat/use-anime";

type Props = {
  children: ReactNode;
  className?: string;
};

export function ErrorFlinch({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    anime.remove(el);
    animate({
      targets: el,
      translateX: [0, -2, 3, -2, 1, 0],
      duration: MOTION.alert.duration,
      easing: EASE_ALERT,
    });
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

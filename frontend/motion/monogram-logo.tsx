"use client";

import { useEffect, useRef } from "react";
import anime from "animejs";
import { prefersReducedMotion } from "./prefers-reduced";

/** SVG monogram with progressive stroke draw-in. */
export function MonogramLogo({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const paths = svg.querySelectorAll<SVGPathElement>("path");

    if (prefersReducedMotion()) {
      paths.forEach((p) => {
        p.style.strokeDasharray = "none";
        p.style.strokeDashoffset = "0";
        p.style.opacity = "1";
      });
      return;
    }

    paths.forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.opacity = "1";
    });

    anime({
      targets: paths,
      strokeDashoffset: [anime.setDashoffset, 0],
      duration: 780,
      delay: anime.stagger(90),
      easing: "easeInOutSine",
    });
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M6 26 V8 L16 20 L26 8 V26"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

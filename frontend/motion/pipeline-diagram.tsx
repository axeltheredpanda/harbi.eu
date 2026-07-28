"use client";

import { useEffect, useRef } from "react";
import anime from "animejs";
import { prefersReducedMotion } from "./prefers-reduced";
import { AXEL_EMBER, AXEL_INK, AXEL_MAROON } from "./axel-project-palette";

const STAGES = [
  { x: 16, label: "Lead" },
  { x: 120, label: "Qualified" },
  { x: 224, label: "Won" },
] as const;

const LINE_Y = 8;
const DOT_RADIUS = 3.5;
const GRADIENT_ID = "axel-crm-pipeline-gradient";

/** Quiet CRM pipeline sketch: a thin line draws in, dots land as it passes. */
export function PipelineDiagram({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const line = svg.querySelector<SVGPathElement>("path");
    const dots = svg.querySelectorAll<SVGCircleElement>("circle");
    if (!line) return;

    if (prefersReducedMotion()) {
      line.style.strokeDasharray = "none";
      line.style.strokeDashoffset = "0";
      dots.forEach((dot) => {
        dot.style.opacity = "1";
        dot.style.transform = "scale(1)";
      });
      return;
    }

    const length = line.getTotalLength();
    line.style.strokeDasharray = `${length}`;
    line.style.strokeDashoffset = `${length}`;
    dots.forEach((dot) => {
      dot.style.opacity = "0";
      dot.style.transform = "scale(0)";
      dot.style.transformBox = "fill-box";
      dot.style.transformOrigin = "center";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          anime
            .timeline({ easing: "easeOutCubic" })
            .add({
              targets: line,
              strokeDashoffset: [length, 0],
              duration: 620,
            })
            .add(
              {
                targets: dots,
                opacity: [0, 1],
                scale: [0, 1],
                duration: 240,
                delay: anime.stagger(220),
              },
              120,
            );
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 240 30"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={AXEL_EMBER} />
          <stop offset="100%" stopColor={AXEL_MAROON} />
        </linearGradient>
      </defs>
      <path
        d={`M ${STAGES[0].x} ${LINE_Y} L ${STAGES[STAGES.length - 1].x} ${LINE_Y}`}
        fill="none"
        stroke={AXEL_INK}
        strokeWidth="1"
      />
      {STAGES.map((stage) => (
        <circle
          key={stage.label}
          cx={stage.x}
          cy={LINE_Y}
          r={DOT_RADIUS}
          fill={`url(#${GRADIENT_ID})`}
        />
      ))}
      {STAGES.map((stage) => (
        <text
          key={stage.label}
          x={stage.x}
          y={LINE_Y + 15}
          textAnchor="middle"
          fill="var(--color-ink-faint)"
          fontSize="7"
          fontFamily="var(--font-mono)"
        >
          {stage.label}
        </text>
      ))}
    </svg>
  );
}

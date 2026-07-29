"use client";

import { useEffect, useRef, type ReactNode } from "react";
import anime from "animejs";
import { prefersReducedMotion } from "./prefers-reduced";
import { AXEL_EMBER, AXEL_MAROON } from "./axel-project-palette";

const REST_ROTATION = 3;
const HOVER_ROTATION = 0.5;

/**
 * Wraps the Axel CRM write-up with a thin ember-to-maroon swatch peeking from
 * its top-right corner — a fragment of the product's real brand identity
 * showing through this site's ink/terracotta treatment of it.
 */
export function AxelBrandSwatch({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const swatchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = swatchRef.current;
    if (!el || prefersReducedMotion()) return;
    anime.set(el, { rotate: REST_ROTATION });
  }, []);

  function handleEnter() {
    if (prefersReducedMotion()) return;
    anime({
      targets: swatchRef.current,
      rotate: HOVER_ROTATION,
      duration: 280,
      easing: "easeOutQuad",
    });
  }

  function handleLeave() {
    if (prefersReducedMotion()) return;
    anime({
      targets: swatchRef.current,
      rotate: REST_ROTATION,
      duration: 280,
      easing: "easeOutQuad",
    });
  }

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        ref={swatchRef}
        aria-hidden="true"
        className="pointer-events-none absolute -z-10"
        style={{
          top: "-0.5rem",
          right: "-0.75rem",
          width: "16.6%",
          height: "0.6rem",
          background: `linear-gradient(135deg, ${AXEL_EMBER}, ${AXEL_MAROON})`,
          transform: `rotate(${REST_ROTATION}deg)`,
        }}
      />
      {children}
    </div>
  );
}

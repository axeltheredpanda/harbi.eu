"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import anime from "animejs";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";

export function NotFoundMotion() {
  const carRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = carRef.current;
    if (!el || prefersReducedMotion()) return;

    anime.set(el, { translateX: -8, translateY: 0, rotate: -4, opacity: 0 });
    const tl = anime.timeline({ autoplay: true });
    tl.add({
      targets: el,
      opacity: 1,
      translateX: 28,
      translateY: -2,
      rotate: 4,
      duration: 480,
      easing: "easeOutCubic",
    })
      .add({
        targets: el,
        translateX: 58,
        translateY: 4,
        rotate: -8,
        duration: 220,
        easing: "easeInOutQuad",
      })
      .add({
        targets: el,
        translateX: 110,
        translateY: 28,
        rotate: 38,
        opacity: 0,
        duration: 680,
        easing: "easeOutBack",
      });

    return () => tl.pause();
  }, []);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24 sm:px-8">
      <p className="font-mono text-sm tracking-wide text-accent">404</p>
      <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        Wrong turn on the stage notes.
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
        This page isn&apos;t on the route book. Recalculate and head back to the
        start.
      </p>

      <div className="relative mt-10 h-16 w-full max-w-sm overflow-hidden">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
        <svg
          ref={carRef}
          viewBox="0 0 48 24"
          className="absolute top-1/2 left-4 h-6 w-12 -translate-y-1/2 text-accent"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M6 16h4l3-6h14l4 6h5v3H6v-3zm8.5 4a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm15 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        </svg>
      </div>

      <p className="mt-8">
        <Link href="/" className="link-underline text-base">
          Back to harbi.eu
        </Link>
      </p>
    </div>
  );
}

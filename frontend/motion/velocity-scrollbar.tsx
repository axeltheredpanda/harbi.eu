"use client";

import { useEffect, useRef } from "react";
import anime from "animejs";
import { prefersReducedMotion } from "./prefers-reduced";

/**
 * Custom cream/terracotta scrollbar with velocity-based thumb stretch.
 */
export function VelocityScrollbar() {
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!thumb || !track) return;

    document.documentElement.classList.add("has-custom-scrollbar");

    let lastY = window.scrollY;
    let lastT = performance.now();
    let stretch = 0;
    let settling: anime.AnimeInstance | null = null;
    let raf = 0;
    const state = { stretch: 0 };

    function syncThumb(extraStretch = 0) {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        track!.style.opacity = "0";
        return;
      }
      track!.style.opacity = "1";
      const trackH = track!.clientHeight;
      const ratio = window.innerHeight / doc.scrollHeight;
      const baseH = Math.max(32, trackH * ratio);
      const stretched = Math.min(trackH * 0.55, baseH * (1 + extraStretch));
      const maxTop = Math.max(0, trackH - stretched);
      const top = (window.scrollY / scrollable) * maxTop;
      thumb!.style.height = `${stretched}px`;
      thumb!.style.transform = `translate3d(0, ${top}px, 0)`;
    }

    function onScroll() {
      const now = performance.now();
      const dy = window.scrollY - lastY;
      const dt = Math.max(16, now - lastT);
      const velocity = dy / dt;
      lastY = window.scrollY;
      lastT = now;

      settling?.pause();
      stretch = Math.min(0.55, Math.abs(velocity) * 8);
      state.stretch = stretch;
      syncThumb(stretch);

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        settling = anime({
          targets: state,
          stretch: 0,
          duration: 420,
          easing: "easeOutCubic",
          update() {
            syncThumb(state.stretch);
          },
        });
      });
    }

    function onResize() {
      syncThumb(state.stretch);
    }

    syncThumb(0);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      document.documentElement.classList.remove("has-custom-scrollbar");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      settling?.pause();
    };
  }, []);

  return (
    <div
      ref={trackRef}
      className="custom-scroll-track pointer-events-none fixed top-3 right-1.5 bottom-3 z-[60] w-1.5 rounded-full bg-canvas/80 opacity-0"
      aria-hidden="true"
    >
      <div
        ref={thumbRef}
        className="custom-scroll-thumb absolute top-0 left-0 w-full rounded-full bg-accent/40"
      />
    </div>
  );
}

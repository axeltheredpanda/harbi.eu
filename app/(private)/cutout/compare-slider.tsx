"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  className?: string;
};

/** Draggable before/after comparison. After side uses checkerboard for transparency. */
export function CompareSlider({ beforeSrc, afterSrc, className = "" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragging.current) return;
      setFromClientX(event.clientX);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX]);

  return (
    <div
      ref={wrapRef}
      className={`relative aspect-[4/3] w-full overflow-hidden border border-border bg-surface select-none ${className}`}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setFromClientX(e.clientX);
      }}
    >
      {/* Transparent result + checkerboard */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #d4cbc0 25%, transparent 25%), linear-gradient(-45deg, #d4cbc0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4cbc0 75%), linear-gradient(-45deg, transparent 75%, #d4cbc0 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
          backgroundColor: "#f3ede4",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterSrc}
          alt="Background removed"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      </div>

      {/* Original clipped */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeSrc}
          alt="Original"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-accent"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-canvas shadow-sm">
          <span className="font-mono text-[10px] text-ink-muted" aria-hidden>
            ⇆
          </span>
        </div>
      </div>

      <span className="pointer-events-none absolute top-3 left-3 rounded-sm bg-canvas/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
        Before
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-sm bg-canvas/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
        After
      </span>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import { EASE_SETTLE } from "@/frontend/motion/easing";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";
import {
  OUTPUT_FORMATS,
  OUTPUT_LABEL,
  badgeExt,
  type OutputFormat,
} from "@/backend/convert/constants";

type Props = {
  value: OutputFormat;
  disabled?: boolean;
  onChange: (format: OutputFormat) => void;
};

export function FormatFlipBadge({ value, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const faceRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function flipThen(run: () => void) {
    const el = faceRef.current;
    if (!el || prefersReducedMotion()) {
      run();
      return;
    }
    anime.remove(el);
    anime({
      targets: el,
      rotateY: [0, 90],
      duration: 160,
      easing: "easeInQuad",
      complete: () => {
        run();
        anime({
          targets: el,
          rotateY: [-90, 0],
          duration: 180,
          easing: EASE_SETTLE,
        });
      },
    });
  }

  function toggle() {
    if (disabled) return;
    flipThen(() => setOpen((v) => !v));
  }

  function pick(format: OutputFormat) {
    flipThen(() => {
      onChange(format);
      setOpen(false);
    });
  }

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      style={{ perspective: "600px" }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Choose output format"
        className="inline-flex min-w-[3.5rem] items-center justify-center border border-border bg-canvas px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
      >
        <span
          ref={faceRef}
          className="inline-block"
          style={{ transformStyle: "preserve-3d" }}
        >
          {open ? "to…" : badgeExt(value)}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-1 min-w-[7rem] border border-border bg-canvas py-1 shadow-sm"
        >
          {OUTPUT_FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              role="option"
              aria-selected={format === value}
              className={`block w-full px-3 py-1.5 text-left font-mono text-xs ${
                format === value
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:bg-surface hover:text-ink"
              }`}
              onClick={() => pick(format)}
            >
              {OUTPUT_LABEL[format]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

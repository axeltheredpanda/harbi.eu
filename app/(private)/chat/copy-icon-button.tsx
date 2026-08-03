"use client";

import { useEffect, useRef, useState } from "react";
import { EASE_SETTLE, EASE_SPRING, MOTION } from "@/frontend/motion/easing";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";
import { animate, anime } from "@/frontend/chat/use-anime";

type Props = {
  text: string;
  onCopy: (text: string) => void;
  className?: string;
  label?: string;
};

const COPY_PATH = "M8 7 L8 5 L16 5 L16 15 L8 15 L8 7";
const CHECK_PATH = "M6 12 L10 16 L18 8 L18 8 L18 8 L18 8";

export function CopyIconButton({
  text,
  onCopy,
  className,
  label = "Copy",
}: Props) {
  const pathRef = useRef<SVGPathElement>(null);
  const timerRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function morph(next: "copy" | "check") {
    const path = pathRef.current;
    if (!path) return;
    const d = next === "check" ? CHECK_PATH : COPY_PATH;

    if (prefersReducedMotion()) {
      path.setAttribute("d", d);
      return;
    }

    anime.remove(path);
    animate({
      targets: path,
      d: [{ value: d }],
      opacity: next === "check" ? [0.55, 1] : [1, 0.72],
      translateY: next === "check" ? [1, 0] : [0, 1],
      duration: next === "check" ? MOTION.spring.duration : MOTION.settle.duration,
      easing: next === "check" ? EASE_SPRING : EASE_SETTLE,
    });
  }

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Keep the UI useful even when the clipboard permission is unavailable.
    }
    onCopy(text);
    setCopied(true);
    morph("check");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      morph("copy");
    }, MOTION.copyHoldMs);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!text}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-faint transition-[background-color,color,opacity] duration-150 hover:bg-accent-soft hover:text-accent disabled:pointer-events-none disabled:opacity-40 ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 overflow-visible"
        aria-hidden="true"
      >
        <path
          ref={pathRef}
          d={copied ? CHECK_PATH : COPY_PATH}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  );
}

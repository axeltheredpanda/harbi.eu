"use client";

import { useEffect, useRef } from "react";
import { EASE_SETTLE, EASE_SPRING, MOTION } from "@/frontend/motion/easing";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";
import { animate, anime } from "@/frontend/chat/use-anime";

type Props = {
  streaming: boolean;
  disabled: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
};

const SEND_PATH = "M5 10 L13 10 L13 6 L20 12 L13 18 L13 14 L5 14 Z";
const STOP_PATH = "M7 7 L17 7 L17 7 L17 17 L17 17 L7 17 L7 17 Z";

function cssVar(name: string) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function SendStopButton({
  streaming,
  disabled,
  canSend,
  onSend,
  onStop,
}: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  const blocked = disabled || (!streaming && !canSend);
  const muted = !streaming && !canSend;

  useEffect(() => {
    const button = buttonRef.current;
    const path = pathRef.current;
    if (!button || !path) return;

    const nextPath = streaming ? STOP_PATH : SEND_PATH;
    const nextBg = streaming
      ? cssVar("--color-surface-hover")
      : canSend
        ? cssVar("--color-accent")
        : cssVar("--color-surface-hover");
    const nextInk = streaming
      ? cssVar("--color-ink-muted")
      : canSend
        ? cssVar("--color-canvas")
        : cssVar("--color-ink-faint");
    const nextBorder = streaming
      ? cssVar("--color-border")
      : canSend
        ? cssVar("--color-accent")
        : cssVar("--color-border");

    if (prefersReducedMotion()) {
      path.setAttribute("d", nextPath);
      button.style.backgroundColor = nextBg;
      button.style.color = nextInk;
      button.style.borderColor = nextBorder;
      return;
    }

    anime.remove([button, path]);
    animate({
      targets: path,
      d: [{ value: nextPath }],
      duration: streaming ? MOTION.spring.duration : MOTION.settle.duration,
      easing: streaming ? EASE_SPRING : EASE_SETTLE,
    });
    animate({
      targets: button,
      backgroundColor: nextBg,
      borderColor: nextBorder,
      color: nextInk,
      scale: streaming ? [0.98, 1] : [1.02, 1],
      duration: streaming ? MOTION.spring.duration : MOTION.settle.duration,
      easing: streaming ? EASE_SPRING : EASE_SETTLE,
    });
  }, [canSend, streaming]);

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={blocked}
      onClick={() => {
        if (blocked) return;
        if (streaming) onStop();
        else onSend();
      }}
      aria-label={streaming ? "Stop Claudette" : "Send message"}
      title={streaming ? "Stop" : "Send"}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border transition-opacity disabled:cursor-not-allowed disabled:opacity-45 ${
        streaming || canSend ? "" : "bg-surface-hover text-ink-faint"
      }`}
      style={{
        backgroundColor: streaming
          ? "var(--color-surface-hover)"
          : muted
            ? "var(--color-surface-hover)"
            : "var(--color-accent)",
        borderColor: streaming || muted ? "var(--color-border)" : "var(--color-accent)",
        color: streaming
          ? "var(--color-ink-muted)"
          : muted
            ? "var(--color-ink-faint)"
            : "var(--color-canvas)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 overflow-visible"
        aria-hidden="true"
      >
        <path ref={pathRef} d={streaming ? STOP_PATH : SEND_PATH} fill="currentColor" />
      </svg>
    </button>
  );
}

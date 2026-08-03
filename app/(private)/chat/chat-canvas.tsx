"use client";

import { useEffect, useRef } from "react";
import { EASE_SPRING, MOTION } from "@/frontend/motion/easing";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";
import { animate, anime } from "@/frontend/chat/use-anime";
import { CopyIconButton } from "./copy-icon-button";

type Props = {
  open: boolean;
  title: string;
  content: string;
  language?: string;
  onClose: () => void;
};

export function ChatCanvas({
  open,
  title,
  content,
  language,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop || prefersReducedMotion()) return;

    anime.set(panel, { translateX: 28, opacity: 0.001 });
    anime.set(backdrop, { opacity: 0 });
    animate({
      targets: panel,
      translateX: 0,
      opacity: 1,
      duration: MOTION.spring.duration,
      easing: EASE_SPRING,
    });
    animate({
      targets: backdrop,
      opacity: 1,
      duration: 260,
      easing: "easeOutCubic",
    });
  }, [open]);

  if (!open) return null;

  const codeLike = Boolean(language);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]"
        role="presentation"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex h-full w-full flex-col border-l border-border bg-canvas shadow-[0_0_40px_rgba(28,25,22,0.12)] sm:max-w-[min(46rem,72vw)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
              canvas
            </p>
            <h2 className="mt-1 truncate font-display text-xl font-medium text-ink">
              {title}
            </h2>
            {language ? (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                {language}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <CopyIconButton
              text={content}
              onCopy={() => undefined}
              label="Copy canvas content"
            />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-faint transition-[background-color,color] duration-150 hover:bg-surface-hover hover:text-ink"
              aria-label="Close canvas"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          {codeLike ? (
            <pre className="min-h-full whitespace-pre-wrap rounded-sm border border-border bg-surface/60 p-4 font-mono text-xs leading-relaxed text-ink">
              <code>{content}</code>
            </pre>
          ) : (
            <article className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {content}
            </article>
          )}
        </div>
      </aside>
    </div>
  );
}

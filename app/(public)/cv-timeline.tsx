"use client";

import { useEffect, useRef, useState } from "react";
import type { CvMilestone } from "@/backend/cv/types";
import { milestoneImageUrl } from "@/frontend/cv/milestone-image";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";

type Props = {
  milestones: CvMilestone[];
  title: string;
  intro: string;
  pdfLabel: string;
  scrollHint: string;
};

function localized(row: CvMilestone) {
  return {
    title: row.title_en || row.title_fr,
    place: row.place_en || row.place_fr,
    summary: row.summary_en || row.summary_fr,
  };
}

function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return mobile;
}

function ActiveContent({
  row
}: {
  row: CvMilestone;
}) {
  const copy = localized(row);
  const image = milestoneImageUrl(row.image_path);

  return (
    <div className="min-h-[11rem] sm:min-h-[12.5rem]">
      <p className="font-mono text-[11px] tracking-[0.16em] text-ink-faint">
        {row.period}
      </p>
      <div className="mt-3 flex items-start gap-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="mt-1 h-9 w-auto max-w-[4.5rem] shrink-0 object-contain"
          />
        ) : null}
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {copy.title}
          </h3>
          {copy.place ? (
            <p className="mt-1.5 text-sm text-ink-muted">{copy.place}</p>
          ) : null}
        </div>
      </div>
      <p className="mt-5 max-w-prose text-base leading-relaxed text-ink-muted">
        {copy.summary}
      </p>
    </div>
  );
}

function VerticalStack({
  milestones,
  title,
  intro,
  pdfLabel,
}: Omit<Props, "scrollHint">) {
  return (
    <section
      id="cv"
      aria-labelledby="cv-heading"
      className="border-t border-border py-16 sm:py-20"
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-prose">
          <h2
            id="cv-heading"
            className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">{intro}</p>
        </div>
        <a
          href="/resume.pdf"
          className="font-mono text-xs text-accent hover:text-accent-strong"
        >
          {pdfLabel}
        </a>
      </div>

      <ol className="relative ml-2 border-l border-border pl-8">
        {milestones.map((row) => {
          const copy = localized(row);
          const image = milestoneImageUrl(row.image_path);
          return (
            <li
              key={row.id}
              id={`cv-milestone-${row.id}`}
              className="relative pb-12 last:pb-0"
            >
              <span
                className="absolute top-1.5 -left-[2.15rem] h-2.5 w-2.5 rounded-full border-2 border-accent bg-canvas"
                aria-hidden="true"
              />
              <p className="font-mono text-[11px] tracking-wide text-ink-faint">
                {row.period}
              </p>
              <div className="mt-2 flex items-start gap-3">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt=""
                    className="mt-0.5 h-8 w-auto max-w-[3.5rem] object-contain"
                  />
                ) : null}
                <div>
                  <h3 className="font-display text-xl font-medium text-ink">
                    {copy.title}
                  </h3>
                  {copy.place ? (
                    <p className="mt-1 text-sm text-ink-muted">{copy.place}</p>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
                {copy.summary}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Pinned CV: sticky viewport, scroll progress fills a terracotta track line;
 * fixed content block swaps with the active milestone. Mobile / reduced motion
 * → vertical stack (native scroll only).
 */
export function CvTimeline({
  milestones,
  title,
  intro,
  pdfLabel,
  scrollHint,
}: Props) {
  const n = milestones.length;
  const pinRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(true);
  const [hintGone, setHintGone] = useState(false);
  const mobile = useIsMobile();

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const useStack = reduced || mobile || n <= 1;

  useEffect(() => {
    if (useStack) {
      setProgress(0);
      return;
    }

    function onScroll() {
      const el = pinRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const raw = -el.getBoundingClientRect().top / total;
      const next = Math.min(1, Math.max(0, raw));
      setProgress(next);
      if (next > 0.04) setHintGone(true);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [useStack]);

  if (n === 0) return null;

  if (useStack) {
    return (
      <VerticalStack
        milestones={milestones}
        
        title={title}
        intro={intro}
        pdfLabel={pdfLabel}
      />
    );
  }

  const activeIndex = Math.min(n - 1, Math.round(progress * (n - 1)));
  const active = milestones[activeIndex]!;
  const showHint = !hintGone && activeIndex === 0 && progress < 0.06;

  function jumpTo(index: number) {
    const el = pinRef.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.offsetTop + (index / Math.max(n - 1, 1)) * total;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function dotState(index: number): "active" | "past" | "upcoming" {
    if (index === activeIndex) return "active";
    if (index < activeIndex) return "past";
    return "upcoming";
  }

  return (
    <section id="cv" aria-labelledby="cv-heading" className="border-t border-border">
      <div
        ref={pinRef}
        className="relative"
        style={{ height: `${n * 100}vh` }}
      >
        <div className="sticky top-0 flex h-svh flex-col justify-center py-14 sm:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-prose">
              <h2
                id="cv-heading"
                className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl"
              >
                {title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                {intro}
              </p>
            </div>
            <a
              href="/resume.pdf"
              className="font-mono text-xs text-accent hover:text-accent-strong"
            >
              {pdfLabel}
            </a>
          </div>

          <div
            key={active.id}
            className="cv-milestone-swap"
            aria-live="polite"
          >
            <ActiveContent row={active}  />
          </div>

          <div className="relative mt-12 px-1 pt-2 sm:px-2">
            {/* Track */}
            <div className="relative mx-1.5 h-px bg-border sm:mx-2" aria-hidden="true">
              <div
                className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-150 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {/* Dots */}
            <div
              className="absolute inset-x-1.5 top-[calc(0.5rem+1px)] -translate-y-1/2 sm:inset-x-2"
              role="tablist"
              aria-label={title}
            >
              {milestones.map((row, index) => {
                const left =
                  n === 1 ? 0 : (index / Math.max(n - 1, 1)) * 100;
                const state = dotState(index);
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="tab"
                    aria-selected={state === "active"}
                    aria-label={`${row.period} - ${localized(row).title}`}
                    onClick={() => jumpTo(index)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-offset-4"
                    style={{ left: `${left}%`, top: "50%" }}
                  >
                    <span
                      className={`block rounded-full border-2 transition-[width,height,background-color,border-color] duration-200 ${
                        state === "active"
                          ? "h-3.5 w-3.5 border-accent bg-accent"
                          : state === "past"
                            ? "h-2.5 w-2.5 border-ink bg-ink"
                            : "h-2.5 w-2.5 border-ink-faint bg-canvas"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex min-h-[1.25rem] items-center justify-between gap-4">
            <p
              className={`font-mono text-[11px] tracking-wide text-ink-faint transition-opacity duration-500 ${
                showHint ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={!showHint}
            >
              {scrollHint}
              <span className="cv-scroll-hint-arrow ml-1.5 inline-block" aria-hidden="true">
                ↓
              </span>
            </p>
            <p className="font-mono text-[10px] tracking-wide text-ink-faint">
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(n).padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

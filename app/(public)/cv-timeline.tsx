"use client";

import { useEffect, useRef, useState } from "react";
import type { CvMilestone } from "@/backend/cv/types";
import { milestoneImageUrl } from "@/frontend/cv/milestone-image";
import type { Locale } from "@/frontend/i18n/landing";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";

type Props = {
  milestones: CvMilestone[];
  locale: Locale;
  title: string;
  intro: string;
  pdfLabel: string;
};

function localized(row: CvMilestone, locale: Locale) {
  if (locale === "en") {
    return {
      title: row.title_en,
      place: row.place_en,
      summary: row.summary_en,
    };
  }
  return {
    title: row.title_fr,
    place: row.place_fr,
    summary: row.summary_fr,
  };
}

function MilestonePanel({
  row,
  locale,
  index,
  total,
}: {
  row: CvMilestone;
  locale: Locale;
  index: number;
  total: number;
}) {
  const copy = localized(row, locale);
  const image = milestoneImageUrl(row.image_path);

  return (
    <article className="flex w-full shrink-0 flex-col justify-center gap-6 px-1 sm:flex-row sm:items-start sm:gap-10">
      <div className="flex shrink-0 items-start gap-4 sm:w-28 sm:flex-col sm:gap-3">
        <p className="font-mono text-xs tracking-[0.16em] text-accent">
          {String(index + 1).padStart(2, "0")}
          <span className="text-ink-faint"> / {String(total).padStart(2, "0")}</span>
        </p>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-10 w-auto max-w-[5.5rem] object-contain opacity-90"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] tracking-wide text-ink-faint">
          {row.period}
        </p>
        <h3 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
          {copy.title}
        </h3>
        {copy.place ? (
          <p className="mt-2 text-sm text-ink-muted">{copy.place}</p>
        ) : null}
        <p className="mt-5 max-w-prose text-base leading-relaxed text-ink-muted">
          {copy.summary}
        </p>
      </div>
    </article>
  );
}

/**
 * Scroll-pinned horizontal CV. Vertical scroll through a tall spacer drives
 * horizontal panel progress. Reduced motion → vertical stack, no pin.
 */
export function CvTimeline({
  milestones,
  locale,
  title,
  intro,
  pdfLabel,
}: Props) {
  const n = milestones.length;
  const pinRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced || n <= 1) {
      setProgress(0);
      return;
    }

    function onScroll() {
      const el = pinRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const raw = -rect.top / total;
      setProgress(Math.min(1, Math.max(0, raw)));
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced, n]);

  if (n === 0) return null;

  const activeIndex =
    n <= 1 ? 0 : Math.min(n - 1, Math.round(progress * (n - 1)));

  function jumpTo(index: number) {
    const el = pinRef.current;
    if (!el || reduced || n <= 1) {
      document
        .getElementById(`cv-milestone-${milestones[index]?.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    const total = el.offsetHeight - window.innerHeight;
    const top = el.offsetTop + (index / Math.max(n - 1, 1)) * total;
    window.scrollTo({ top, behavior: "smooth" });
  }

  const header = (
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
  );

  const dots = (
    <div
      className="mt-10 flex items-center gap-2"
      role="tablist"
      aria-label={title}
    >
      {milestones.map((row, index) => (
        <button
          key={row.id}
          type="button"
          role="tab"
          aria-selected={index === activeIndex}
          aria-label={`${row.period} — ${localized(row, locale).title}`}
          onClick={() => jumpTo(index)}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            index === activeIndex
              ? "bg-accent"
              : "bg-border hover:bg-ink-faint"
          }`}
        />
      ))}
      <span className="ml-3 font-mono text-[10px] tracking-wide text-ink-faint">
        {String(activeIndex + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
      </span>
    </div>
  );

  if (reduced) {
    return (
      <section
        id="cv"
        aria-labelledby="cv-heading"
        className="border-t border-border py-16 sm:py-20"
      >
        {header}
        <ol className="mt-4 space-y-14">
          {milestones.map((row, index) => (
            <li key={row.id} id={`cv-milestone-${row.id}`}>
              <MilestonePanel
                row={row}
                locale={locale}
                index={index}
                total={n}
              />
            </li>
          ))}
        </ol>
        {dots}
      </section>
    );
  }

  const translatePercent =
    n <= 1 ? 0 : (progress * (n - 1) * 100) / n;

  return (
    <section
      id="cv"
      aria-labelledby="cv-heading"
      className="border-t border-border"
    >
      <div
        ref={pinRef}
        className="relative"
        style={{ height: `${Math.max(n, 1) * 100}vh` }}
      >
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden py-16">
          {header}
          <div className="relative w-full overflow-hidden">
            <div
              className="flex will-change-transform"
              style={{
                width: `${n * 100}%`,
                transform: `translate3d(-${translatePercent}%, 0, 0)`,
              }}
            >
              {milestones.map((row, index) => (
                <div
                  key={row.id}
                  id={`cv-milestone-${row.id}`}
                  className="shrink-0 px-0"
                  style={{ width: `${100 / n}%` }}
                  aria-hidden={index !== activeIndex}
                >
                  <div
                    className="transition-opacity duration-300"
                    style={{
                      opacity:
                        Math.abs(index - progress * Math.max(n - 1, 1)) < 0.55
                          ? 1
                          : 0.35,
                    }}
                  >
                    <MilestonePanel
                      row={row}
                      locale={locale}
                      index={index}
                      total={n}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {dots}
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  dictionaries,
  type LandingCopy,
  type Locale,
} from "@/frontend/i18n/landing";
import type { NoteMeta } from "@/backend/notes";
import type { GithubActivity } from "@/backend/github";
import type { NationalFuelPrice } from "@/backend/fuel";
import type { CvMilestone } from "@/backend/cv/types";
import type { RelationshipStatus } from "@/backend/supabase/types";
import { nowItems } from "@/content/now";
import type { NowPlaying } from "@/content/now-playing";
import { HeroAssemble } from "@/frontend/motion/hero-assemble";
import { ScrollReveal } from "@/frontend/motion/scroll-reveal";
import { CountUp } from "@/frontend/motion/count-up";
import { MonogramLogo } from "@/frontend/motion/monogram-logo";
import { PipelineDiagram } from "@/frontend/motion/pipeline-diagram";
import { morphTheme } from "@/frontend/motion/theme-morph";
import { openNewsDrawer } from "@/frontend/news/news-provider";
import { FuelStatusLine } from "./fuel-status-line";
import { CvTimeline } from "./cv-timeline";
import { SpecimenCard } from "./specimen-card";

const AXEL_CRM_STACK = ["Java", "React", "Supabase", "Stripe"] as const;
const AXEL_CRM_YEARS = "2025—";

const SITE_LAUNCH_MS = Date.UTC(2026, 6, 27);
/** One Red Bull every 8 hours from launch (= 3/day). */
const REDBULL_EVERY_MS = 8 * 3_600_000;
const REDBULL_BASE = 8;
const LOCALE_KEY = "harbi.locale";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

type Props = {
  initialLocale: Locale;
  notes: NoteMeta[];
  github: GithubActivity;
  relationshipStatus: RelationshipStatus;
  singleSince: string;
  fuel: NationalFuelPrice | null;
  milestones: CvMilestone[];
  nowPlaying: NowPlaying;
  commitSha: string | null;
  buildDate: string;
};

function redbullCount(now = Date.now()): number {
  const elapsed = Math.max(0, now - SITE_LAUNCH_MS);
  return REDBULL_BASE + Math.floor(elapsed / REDBULL_EVERY_MS);
}

function daysSince(isoDate: string, now = Date.now()): number {
  const start = Date.parse(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 86_400_000));
}

function pickJoke(copy: LandingCopy, exclude?: string): string {
  const pool = copy.statusJokes;
  if (pool.length === 0) return "";
  if (pool.length === 1) return pool[0];
  let next = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  if (exclude && pool.length > 1) {
    let guard = 0;
    while (next === exclude && guard < 8) {
      next = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
      guard += 1;
    }
  }
  return next;
}

export function LandingPage({
  initialLocale,
  notes,
  github,
  relationshipStatus,
  singleSince,
  fuel,
  milestones,
  nowPlaying,
  commitSha,
  buildDate,
}: Props) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [rally, setRally] = useState(false);
  const [redbulls, setRedbulls] = useState(() => redbullCount());
  const [singleDays, setSingleDays] = useState(() =>
    relationshipStatus === "single" ? daysSince(singleSince) : 0,
  );
  const [statusJoke, setStatusJoke] = useState("");
  const [clickTimes, setClickTimes] = useState<number[]>([]);
  const [themeBusy, setThemeBusy] = useState(false);

  const copy = dictionaries[locale];
  const numberLocale = locale === "fr" ? "fr-FR" : "en-GB";
  const isSingle = relationshipStatus === "single";
  const statusWord = isSingle ? copy.statusSingle : copy.statusDating;
  const onlineDays = daysSince(
    new Date(SITE_LAUNCH_MS).toISOString().slice(0, 10),
  );
  const commitLabel = commitSha ? commitSha.slice(0, 7) : "dev";
  const nowPlayingLine = `${nowPlaying.title} — ${nowPlaying.artist}`;

  const enableRally = useCallback(async () => {
    if (themeBusy || rally) return;
    setThemeBusy(true);
    setRally(true);
    await morphTheme(true);
    setThemeBusy(false);
  }, [themeBusy, rally]);

  const disableRally = useCallback(async () => {
    if (themeBusy || !rally) return;
    setThemeBusy(true);
    setRally(false);
    await morphTheme(false);
    setThemeBusy(false);
  }, [themeBusy, rally]);

  useEffect(() => {
    // Restore locale before paint when possible — still may differ from SSR
    try {
      const stored = window.localStorage.getItem(LOCALE_KEY);
      if ((stored === "fr" || stored === "en") && stored !== initialLocale) {
        setLocale(stored);
      }
    } catch {
      // ignore
    }
  }, [initialLocale]);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.theme;
      for (const key of [
        "--color-canvas",
        "--color-surface",
        "--color-surface-hover",
        "--color-border",
        "--color-ink",
        "--color-ink-muted",
        "--color-ink-faint",
        "--color-accent",
        "--color-accent-strong",
        "--color-accent-soft",
      ]) {
        document.documentElement.style.removeProperty(key);
      }
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const now = Date.now();
      setRedbulls(redbullCount(now));
      if (isSingle) {
        setSingleDays(daysSince(singleSince, now));
        setStatusJoke((prev) => pickJoke(dictionaries[locale], prev));
      } else {
        setStatusJoke("");
      }
    });
    const id = window.setInterval(() => {
      const tick = Date.now();
      setRedbulls(redbullCount(tick));
      if (isSingle) {
        setSingleDays(daysSince(singleSince, tick));
        setStatusJoke((prev) => pickJoke(dictionaries[locale], prev));
      }
    }, 60_000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(id);
    };
  }, [locale, isSingle, singleSince]);

  useEffect(() => {
    let index = 0;
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const expected = KONAMI[index];
      const match =
        key === expected ||
        (expected.length === 1 && key === expected.toLowerCase());
      if (match) {
        index += 1;
        if (index === KONAMI.length) {
          index = 0;
          void enableRally();
        }
      } else {
        index = key === KONAMI[0] ? 1 : 0;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableRally]);

  function handleLocale(next: Locale) {
    setLocale(next);
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // ignore
    }
  }

  function handleNameClick() {
    const now = Date.now();
    const recent = [...clickTimes.filter((t) => now - t < 700), now];
    setClickTimes(recent);
    if (recent.length >= 3) {
      setClickTimes([]);
      void enableRally();
    }
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {rally && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-2 rally-stripe"
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 border-b border-border bg-accent-soft/70">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-3 font-mono text-[11px] leading-relaxed tracking-wide sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-8 sm:py-2.5 sm:text-xs">
          <p className="min-w-0 flex-1 text-ink-muted sm:pr-2">
            <span className="text-ink-faint">{copy.relationshipLabel}</span>
            <span className="text-ink-faint" aria-hidden="true">
              {" · "}
            </span>
            <span className="text-ink">{statusWord}</span>
            {isSingle && (
              <>
                <span className="text-ink-faint" aria-hidden="true">
                  {" · "}
                </span>
                <CountUp value={singleDays} locale={numberLocale} />{" "}
                <span className="text-ink-faint">{copy.days}</span>
                {statusJoke ? (
                  <>
                    {" "}
                    <span className="text-accent">{statusJoke}</span>
                  </>
                ) : null}
              </>
            )}
          </p>

          <div className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 sm:justify-end sm:gap-x-5">
            <p
              className="inline-flex items-baseline gap-x-1.5 text-ink-muted"
              title={
                locale === "fr"
                  ? "Depuis le lancement. Pas une vraie métrique — ailes non incluses."
                  : "Since launch. Not a real metric. Wings not included."
              }
            >
              <span className="text-ink-faint">{copy.redbulls}</span>
              <CountUp value={redbulls} locale={numberLocale} />
            </p>
            {fuel ? (
              <>
                <span
                  className="hidden h-3 w-px bg-border sm:inline-block"
                  aria-hidden="true"
                />
                <FuelStatusLine
                  price={fuel}
                  locale={locale}
                  label={copy.fuelLabel}
                  unit={copy.fuelUnit}
                  rangeLabel={copy.fuelRange}
                  trendLabel={copy.fuelTrend}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 hidden border-b border-border sm:block">
        <div className="mx-auto flex w-full max-w-3xl px-6 py-2 sm:px-8">
          <a
            href={nowPlaying.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 max-w-full items-center gap-2 font-mono text-[11px] tracking-wide text-ink-muted transition-colors hover:text-accent sm:text-xs"
            title={nowPlayingLine}
          >
            <svg
              viewBox="0 0 16 16"
              className="eq-icon h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
              fill="none"
            >
              <line
                className="eq-bar eq-bar-1"
                x1="3.5"
                y1="12"
                x2="3.5"
                y2="5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                className="eq-bar eq-bar-2"
                x1="8"
                y1="12"
                x2="8"
                y2="3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                className="eq-bar eq-bar-3"
                x1="12.5"
                y1="12"
                x2="12.5"
                y2="6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-ink-faint shrink-0">{copy.listeningTo}</span>
            <span className="min-w-0 truncate">{nowPlayingLine}</span>
          </a>
        </div>
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-2xl items-baseline justify-between gap-6 px-6 pt-8 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display text-lg tracking-tight text-ink transition-colors hover:text-accent"
        >
          <MonogramLogo className="h-5 w-5 text-accent" />
          <span>harbi.eu</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-ink-muted sm:gap-x-5">
          <a href="#work" className="transition-colors hover:text-ink">
            {copy.navWork}
          </a>
          {milestones.length > 0 ? (
            <a href="#cv" className="transition-colors hover:text-ink">
              {copy.navCv}
            </a>
          ) : null}
          <a href="#now" className="transition-colors hover:text-ink">
            {copy.navNow}
          </a>
          <a href="#notes" className="transition-colors hover:text-ink">
            {copy.navNotes}
          </a>
          <button
            type="button"
            onClick={() => openNewsDrawer()}
            className="transition-colors hover:text-ink"
          >
            {copy.navNews}
          </button>
          <a href="#contact" className="transition-colors hover:text-ink">
            {copy.navContact}
          </a>
          <Link href="/login" className="transition-colors hover:text-ink">
            {copy.navLogin}
          </Link>
          <span className="inline-flex items-center gap-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => handleLocale("fr")}
              className={
                locale === "fr" ? "text-accent" : "text-ink-faint hover:text-ink"
              }
              aria-pressed={locale === "fr"}
            >
              {copy.langFr}
            </button>
            <span className="text-border">/</span>
            <button
              type="button"
              onClick={() => handleLocale("en")}
              className={
                locale === "en" ? "text-accent" : "text-ink-faint hover:text-ink"
              }
              aria-pressed={locale === "en"}
            >
              {copy.langEn}
            </button>
          </span>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 sm:px-8">
        <section className="pb-20 pt-20 sm:pb-28 sm:pt-28">
          <p className="animate-rise text-sm tracking-wide text-ink-faint">
            {copy.available}
          </p>
          <h1 className="mt-5 font-display text-[2.75rem] leading-[1.1] font-medium tracking-tight text-ink sm:text-6xl">
            <HeroAssemble
              text="Arthur Reichard"
              onActivate={handleNameClick}
              aria-label="Arthur Reichard"
              className="cursor-default text-left transition-colors hover:text-accent focus-visible:rounded-sm"
            />
          </h1>
          <p className="animate-rise-delay-2 mt-8 max-w-xl text-lg leading-[1.7] text-ink-muted sm:text-xl sm:leading-[1.75]">
            {copy.bio}
          </p>
          <p className="animate-rise-delay-2 mt-6 flex flex-wrap gap-x-6 gap-y-2 text-base">
            <a href="#contact" className="link-underline">
              {copy.writeToMe}
            </a>
            <a href="/resume.pdf" className="link-underline">
              {copy.readResume}
            </a>
          </p>
        </section>

        <section id="work" className="border-t border-border py-16 sm:py-20">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {copy.workTitle}
          </h2>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-muted">
            {copy.workIntro}
          </p>
          <ScrollReveal
            as="div"
            className="mt-12 divide-y divide-border border-t border-border"
            selector=":scope > article"
            stagger={80}
          >
            {copy.projects.map((project, index) => {
              const isAxelCrm = project.name === "Axel CRM";
              return (
                <SpecimenCard
                  key={project.name}
                  number={String(index + 1).padStart(2, "0")}
                  name={project.name}
                  stack={
                    isAxelCrm ? [...AXEL_CRM_STACK] : project.stack ?? []
                  }
                  years={isAxelCrm ? AXEL_CRM_YEARS : (project.years ?? "—")}
                  note={project.wink}
                  description={project.description}
                  catalogStatus={copy.notYetOnView}
                  pipeline={
                    isAxelCrm ? (
                      <PipelineDiagram className="mt-5 h-5 w-full max-w-[180px] opacity-70" />
                    ) : undefined
                  }
                />
              );
            })}
          </ScrollReveal>

          <p className="mt-14 max-w-md font-mono text-[0.65rem] leading-relaxed tracking-[0.14em] text-ink-faint uppercase">
            {copy.studioCredit}
          </p>

          {github && (
            <p className="mt-10 border-t border-border pt-6 font-mono text-xs leading-relaxed text-ink-faint">
              {copy.githubActivity} ·{" "}
              <a
                href={github.url}
                className="text-ink-muted transition-colors hover:text-accent"
              >
                {github.repo}
              </a>
              {" — "}
              <span className="text-ink-muted">{github.message}</span>
            </p>
          )}
        </section>

        {milestones.length > 0 ? (
          <CvTimeline
            milestones={milestones}
            locale={locale}
            title={copy.cvTitle}
            intro={copy.cvIntro}
            pdfLabel={copy.cvPdf}
            scrollHint={copy.cvScrollHint}
          />
        ) : null}

        <section id="now" className="border-t border-border py-16 sm:py-20">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {copy.nowTitle}
          </h2>
          <ScrollReveal
            as="ul"
            className="mt-8 list-none max-w-prose space-y-4 text-base leading-relaxed text-ink-muted"
            selector=":scope > li"
            stagger={60}
          >
            {nowItems.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <span>{locale === "fr" ? item.fr : item.en}</span>
              </li>
            ))}
          </ScrollReveal>
        </section>

        <section id="notes" className="border-t border-border py-16 sm:py-20">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
              {copy.notesTitle}
            </h2>
            <Link
              href="/notes"
              className="font-mono text-xs text-accent hover:text-accent-strong"
            >
              {copy.notesAll}
            </Link>
          </div>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-muted">
            {copy.notesIntro}
          </p>
          <ScrollReveal
            as="ul"
            className="mt-10 flex list-none flex-col"
            selector=":scope > li"
            stagger={70}
          >
            {notes.map((note) => (
              <li
                key={note.slug}
                className="border-t border-border py-6 first:border-t-0 first:pt-0"
              >
                <p className="font-mono text-[11px] tracking-wide text-ink-faint">
                  {note.date}
                </p>
                <h3 className="mt-2 font-display text-xl font-medium text-ink">
                  <Link href={`/notes/${note.slug}`} className="hover:text-accent">
                    {note.title}
                  </Link>
                </h3>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
                  {note.excerpt}
                </p>
                <Link
                  href={`/notes/${note.slug}`}
                  className="link-underline mt-3 inline-block text-sm"
                >
                  {copy.notesRead}
                </Link>
              </li>
            ))}
          </ScrollReveal>
        </section>

        <section
          id="skills"
          className="group/skills border-t border-border py-16 sm:py-20"
        >
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {copy.skillsTitle}
          </h2>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-muted">
            {copy.skillsIntro}
          </p>
          <ScrollReveal
            as="ul"
            className="mt-8 list-none max-w-prose space-y-3 text-base leading-relaxed text-ink-muted"
            selector=":scope > li:not([aria-hidden])"
            stagger={55}
          >
            {copy.skills.map((skill) => (
              <li key={skill} className="flex gap-3">
                <span
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <span>{skill}</span>
              </li>
            ))}
            <li
              className="flex max-h-0 gap-3 overflow-hidden opacity-0 transition-[max-height,opacity,margin] duration-200 ease-out group-hover/skills:mt-1 group-hover/skills:max-h-12 group-hover/skills:opacity-100"
              aria-hidden="true"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span>{copy.jokeSkill}</span>
            </li>
          </ScrollReveal>
        </section>

        <section id="contact" className="border-t border-border py-16 sm:py-24">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {copy.contactTitle}
          </h2>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted">
            {copy.contactBody}
          </p>
          <p className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-base">
            <a href="mailto:arthur.reichard@essec.edu" className="link-underline">
              arthur.reichard@essec.edu
            </a>
            <a
              href="https://github.com/axeltheredpanda"
              className="link-underline"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/arthur-reichard/"
              className="link-underline"
            >
              LinkedIn
            </a>
          </p>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-2xl px-6 pb-12 pt-4 sm:px-8">
        <p className="text-sm text-ink-faint">harbi.eu</p>
        <p className="mt-1 font-mono text-[11px] text-ink-faint">
          <span>{commitLabel}</span>
          <span aria-hidden="true">{" · "}</span>
          <span>{buildDate}</span>
          <span aria-hidden="true">{" · "}</span>
          <span>
            {copy.onlineSince} {onlineDays} {copy.days}
          </span>
        </p>
      </footer>

      {rally && (
        <button
          type="button"
          onClick={() => void disableRally()}
          disabled={themeBusy}
          className="fixed right-4 bottom-4 z-20 rounded-sm border border-border bg-canvas px-3 py-2 font-mono text-[11px] tracking-wide text-ink shadow-sm transition-colors hover:bg-accent-soft sm:right-6 sm:bottom-6"
        >
          {copy.exitRally}
        </button>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Project = {
  name: string;
  wink: string;
  description: string;
  url?: string;
};

const projects: Project[] = [
  {
    name: "Axel Project",
    wink: "Named after myself — not out of vanity, out of accountability.",
    description:
      "An end-to-end product: schema, interface, and the boring glue between them. Still tightening the public one-liner for who it serves.",
  },
  {
    name: "Astraia",
    wink: "The kind of idea that looked simple on a whiteboard and then politely refused.",
    description:
      "Work in progress on a focused problem space. Stack and outcomes land here once the shape stops shifting.",
  },
];

const skills = [
  "Next.js, React, TypeScript, Tailwind",
  "Supabase, PostgreSQL, Node",
  "Vercel, Git, Anthropic API",
];

const JOKE_SKILL = "Excel — expert level (post-traumatic)";

const SITE_LAUNCH_MS = Date.UTC(2026, 6, 1); // 1 Jul 2026
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

function coffeeCount(now = Date.now()): number {
  const hours = Math.max(0, (now - SITE_LAUNCH_MS) / 3_600_000);
  // ~3–4 cups/day with a gentle wobble — not a real metric.
  return Math.floor(12 + hours * 0.155 + Math.sin(hours / 9) * 2.4 + (hours % 17) * 0.08);
}

export function LandingPage() {
  const [rally, setRally] = useState(false);
  const [coffees, setCoffees] = useState(() => coffeeCount());
  const [clickTimes, setClickTimes] = useState<number[]>([]);

  const enableRally = useCallback(() => {
    setRally(true);
    document.documentElement.dataset.theme = "rally";
  }, []);

  const disableRally = useCallback(() => {
    setRally(false);
    delete document.documentElement.dataset.theme;
  }, []);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setCoffees(coffeeCount()), 60_000);
    return () => window.clearInterval(id);
  }, []);

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
          enableRally();
        }
      } else {
        index = key === KONAMI[0] ? 1 : 0;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableRally]);

  function handleNameClick() {
    const now = Date.now();
    const recent = [...clickTimes.filter((t) => now - t < 700), now];
    setClickTimes(recent);
    if (recent.length >= 3) {
      setClickTimes([]);
      enableRally();
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

      <header className="relative z-10 mx-auto flex w-full max-w-2xl items-baseline justify-between gap-6 px-6 pt-10 sm:px-8">
        <Link
          href="/"
          className="font-display text-lg tracking-tight text-ink transition-colors hover:text-accent"
        >
          harbi.eu
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm text-ink-muted">
          <a href="#work" className="transition-colors hover:text-ink">
            Work
          </a>
          <a href="#notes" className="transition-colors hover:text-ink">
            Notes
          </a>
          <a href="#contact" className="transition-colors hover:text-ink">
            Contact
          </a>
          <Link
            href="/login"
            className="transition-colors hover:text-ink"
          >
            Login
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 sm:px-8">
        <section className="pb-20 pt-24 sm:pb-28 sm:pt-32">
          <p className="animate-rise text-sm tracking-wide text-ink-faint">
            Available for opportunities
          </p>
          <h1 className="animate-rise-delay mt-5 font-display text-[2.75rem] leading-[1.1] font-medium tracking-tight text-ink sm:text-6xl">
            <button
              type="button"
              onClick={handleNameClick}
              className="cursor-default text-left transition-colors hover:text-accent focus-visible:rounded-sm"
              aria-label="Arthur Reichard"
              title={rally ? "Already in rally mode" : undefined}
            >
              Arthur Reichard
            </button>
          </h1>
          <p className="animate-rise-delay-2 mt-8 max-w-xl text-lg leading-[1.7] text-ink-muted sm:text-xl sm:leading-[1.75]">
            Fresh off a digital / e-commerce internship, currently arguing with
            an internal AI tool that keeps losing. I still build software the
            careful way — schema to screen — and care about naming, structure,
            and the sentence a product leaves behind.
          </p>
          <p className="animate-rise-delay-2 mt-6 flex flex-wrap gap-x-6 gap-y-2 text-base">
            <a href="#contact" className="link-underline">
              Write to me
            </a>
            <a href="/resume.pdf" className="link-underline">
              Read the résumé
            </a>
          </p>
        </section>

        <section id="work" className="border-t border-border py-16 sm:py-20">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Selected work
          </h2>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-muted">
            A short shelf. Each piece is something I shaped myself, or nearly so.
          </p>

          <ul className="mt-12 flex flex-col">
            {projects.map((project) => (
              <li
                key={project.name}
                className="border-t border-border py-8 first:border-t-0 first:pt-0"
              >
                <h3 className="font-display text-xl font-medium text-ink">
                  {project.url ? (
                    <a href={project.url} className="link-underline">
                      {project.name}
                    </a>
                  ) : (
                    project.name
                  )}
                </h3>
                <p className="mt-3 max-w-prose font-display text-[0.95rem] italic leading-relaxed text-ink-faint">
                  {project.wink}
                </p>
                <p className="mt-2 max-w-prose text-base leading-relaxed text-ink-muted">
                  {project.description}
                </p>
                {!project.url && (
                  <p className="mt-3 text-sm text-ink-faint">Link soon.</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section
          id="notes"
          className="group/skills border-t border-border py-16 sm:py-20"
        >
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            How I work
          </h2>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-muted">
            The stack I reach for when the problem is real.
          </p>
          <ul className="mt-8 max-w-prose space-y-3 text-base leading-relaxed text-ink-muted">
            {skills.map((skill) => (
              <li key={skill} className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                <span>{skill}</span>
              </li>
            ))}
            <li
              className="flex max-h-0 gap-3 overflow-hidden opacity-0 transition-[max-height,opacity,margin] duration-200 ease-out group-hover/skills:mt-1 group-hover/skills:max-h-12 group-hover/skills:opacity-100"
              aria-hidden="true"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span>{JOKE_SKILL}</span>
            </li>
          </ul>
        </section>

        <section id="contact" className="border-t border-border py-16 sm:py-24">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Let&apos;s talk
          </h2>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted">
            If something here resonates — a role, a collaboration, a question —
            send a note. I read everything that arrives.
          </p>
          <p className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-base">
            <a href="mailto:hello@harbi.eu" className="link-underline">
              hello@harbi.eu
            </a>
            <a
              href="https://github.com/axeltheredpanda"
              className="link-underline"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/yourusername"
              className="link-underline"
            >
              LinkedIn
            </a>
          </p>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 pb-12 pt-4 sm:px-8">
        <p className="text-sm text-ink-faint">harbi.eu</p>
        <p
          className="font-mono text-[11px] tracking-wide text-ink-faint/80"
          title="Not a real metric. Please do not cite in a stand-up."
        >
          Coffees since launch · {coffees.toLocaleString("en-GB")}
        </p>
      </footer>

      {rally && (
        <button
          type="button"
          onClick={disableRally}
          className="fixed right-4 bottom-4 z-20 rounded-sm border border-border bg-canvas px-3 py-2 font-mono text-[11px] tracking-wide text-ink shadow-sm transition-colors hover:bg-accent-soft sm:right-6 sm:bottom-6"
        >
          Exit rally mode
        </button>
      )}
    </div>
  );
}

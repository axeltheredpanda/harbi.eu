"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { openNewsDrawer } from "@/frontend/news/news-provider";

type Command = {
  id: string;
  label: string;
  keywords: string;
  href?: string;
  action?: "news";
};

const COMMANDS: Command[] = [
  {
    id: "news",
    label: "News · RSS reader",
    keywords: "feeds headlines reader atom",
    action: "news",
  },
  {
    id: "chat",
    label: "Chat · Claudette",
    href: "/chat",
    keywords: "claudette ai conversation",
  },
  {
    id: "cutout",
    label: "Cutout · remove background",
    href: "/cutout",
    keywords: "rembg background remove png cutout",
  },
  {
    id: "market",
    label: "Market · watchlist",
    href: "/market",
    keywords: "stocks tickers prices",
  },
  {
    id: "garage",
    label: "Garage · vehicle tracker",
    href: "/garage",
    keywords: "cars vehicles search",
  },
  {
    id: "analytics",
    label: "Analytics · usage report",
    href: "/analytics",
    keywords: "tokens cost usage health stats report",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    keywords: "relationship status single dating",
  },
  {
    id: "home",
    label: "Public site",
    href: "/",
    keywords: "landing portfolio",
  },
];

function score(query: string, label: string, keywords: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const hay = `${label} ${keywords}`.toLowerCase();
  if (hay.includes(q)) return 10 - hay.indexOf(q) * 0.01;
  let i = 0;
  for (const ch of hay) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return 3;
  }
  return 0;
}

function runCommand(cmd: Command, router: ReturnType<typeof useRouter>) {
  if (cmd.action === "news") {
    openNewsDrawer();
    return;
  }
  if (cmd.href) router.push(cmd.href);
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    return COMMANDS.map((cmd) => ({
      ...cmd,
      score: score(query, cmd.label, cmd.keywords),
    }))
      .filter((cmd) => cmd.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Windows-first: Ctrl+K (Meta still accepted for Mac keyboards)
      const isPalette =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (isPalette) {
        event.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const target = results[active];
        if (target) {
          setOpen(false);
          runCommand(target, router);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, results, active, router]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 px-4 pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-md border border-border bg-canvas shadow-lg"
      >
        <div className="border-b border-border px-3 py-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Go to…"
            className="w-full bg-transparent px-1 py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-4 py-3 font-mono text-xs text-ink-faint">
              No matches
            </li>
          )}
          {results.map((cmd, index) => (
            <li key={cmd.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  setOpen(false);
                  runCommand(cmd, router);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                  index === active
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:bg-surface"
                }`}
              >
                <span>{cmd.label}</span>
                <span className="font-mono text-[11px] text-ink-faint">
                  {cmd.action === "news" ? "drawer" : cmd.href}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-2 font-mono text-[10px] text-ink-faint">
          ↑↓ navigate · Enter open · Esc close · Ctrl+K
        </p>
      </div>
    </div>
  );
}

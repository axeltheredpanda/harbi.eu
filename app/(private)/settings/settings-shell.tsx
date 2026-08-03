"use client";

import { useState, type ReactNode } from "react";

export type SettingsTab = "site" | "cv" | "claudette" | "memory";

type Props = {
  site: ReactNode;
  cv: ReactNode;
  claudette: ReactNode;
  memory: ReactNode;
};

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "site", label: "Site" },
  { id: "cv", label: "CV" },
  { id: "claudette", label: "Claudette" },
  { id: "memory", label: "Memory" },
];

export function SettingsShell({ site, cv, claudette, memory }: Props) {
  const [tab, setTab] = useState<SettingsTab>("site");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-16">
      <header className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          Private · settings
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Settings
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          Banner dials, the public CV timeline, Claudette’s private brief, and
          long-term memories.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`settings-tab-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 font-mono text-xs tracking-wide transition-colors ${
                selected
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        key={tab}
        role="tabpanel"
        aria-labelledby={`settings-tab-${tab}`}
        className="page-turn-panel min-h-[24rem]"
      >
        {tab === "site" ? site : null}
        {tab === "cv" ? cv : null}
        {tab === "claudette" ? claudette : null}
        {tab === "memory" ? memory : null}
      </div>
    </div>
  );
}

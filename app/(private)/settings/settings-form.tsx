"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/frontend/components/button-variants";
import {
  updateLouisJokeMode,
  updateRelationshipSettings,
  type PublicSiteSettings,
} from "@/backend/settings";
import { LOUIS_COPY } from "@/backend/louis";
import type { RelationshipStatus } from "@/backend/supabase/types";

type Props = {
  initial: PublicSiteSettings;
};

export function SettingsForm({ initial }: Props) {
  const [status, setStatus] = useState<RelationshipStatus>(
    initial.relationshipStatus,
  );
  const [singleSince, setSingleSince] = useState(initial.singleSince);
  const [louisJoke, setLouisJoke] = useState(initial.louisJokeMode);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const next = await updateRelationshipSettings({
          relationshipStatus: status,
          singleSince:
            status === "single"
              ? singleSince
              : initial.singleSince || singleSince,
        });
        setStatus(next.relationshipStatus);
        setSingleSince(next.singleSince);
        setMessage(
          next.relationshipStatus === "single"
            ? "Saved — jokes are back on the public banner."
            : "Saved — jokes stay off while you’re dating.",
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t save settings");
      }
    });
  }

  function handleLouisToggle(next: boolean) {
    setError(null);
    setLouisJoke(next);
    startTransition(async () => {
      try {
        const saved = await updateLouisJokeMode(next);
        setLouisJoke(saved.louisJokeMode);
        setMessage(
          saved.louisJokeMode ? LOUIS_COPY.settingsOn : LOUIS_COPY.settingsOff,
        );
      } catch (err) {
        setLouisJoke(!next);
        setError(
          err instanceof Error ? err.message : "Couldn’t save Louis mode",
        );
      }
    });
  }

  return (
    <div className="space-y-10">
      <form onSubmit={handleSave} className="space-y-8">
        <section className="space-y-4">
          <h2 className="font-display text-xl font-medium text-ink">
            Relationship status
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            When it’s <span className="text-ink">single</span>, the banner shows
            the day count and the rotating jokes in parentheses. When it’s{" "}
            <span className="text-ink">dating</span>, just the status — no jokes.
          </p>

          <fieldset className="space-y-3">
            <legend className="sr-only">Relationship status</legend>
            {(
              [
                {
                  id: "single" as const,
                  label: "Single",
                  detail: "Days + parenthetical jokes on the public banner.",
                },
                {
                  id: "dating" as const,
                  label: "Dating",
                  detail: "Status only — jokes stay in the drawer.",
                },
              ] as const
            ).map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer gap-3 border px-4 py-3 transition-colors ${
                  status === option.id
                    ? "border-accent bg-accent-soft/50"
                    : "border-border hover:border-ink-faint"
                }`}
              >
                <input
                  type="radio"
                  name="relationship"
                  value={option.id}
                  checked={status === option.id}
                  onChange={() => setStatus(option.id)}
                  className="mt-1 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="block font-display text-base text-ink">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">
                    {option.detail}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {status === "single" && (
            <label className="block space-y-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                Single since
              </span>
              <input
                type="date"
                value={singleSince}
                onChange={(e) => setSingleSince(e.target.value)}
                className="block w-full max-w-xs border border-border bg-canvas px-3 py-2 text-sm text-ink"
              />
              <span className="block text-xs text-ink-faint">
                Used for the day counter next to the status.
              </span>
            </label>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={buttonClass("primary")}
          >
            {pending ? "Saving…" : "Save relationship"}
          </button>
        </div>
      </form>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-xl font-medium text-ink">
          {LOUIS_COPY.settingsTitle}
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          {LOUIS_COPY.settingsDetail}
        </p>
        <label
          className={`flex cursor-pointer items-start gap-3 border px-4 py-3 transition-colors ${
            louisJoke
              ? "border-accent bg-accent-soft/50"
              : "border-border hover:border-ink-faint"
          }`}
        >
          <input
            type="checkbox"
            checked={louisJoke}
            disabled={pending}
            onChange={(e) => handleLouisToggle(e.target.checked)}
            className="mt-1 accent-[var(--color-accent)]"
          />
          <span>
            <span className="block font-display text-base text-ink">
              Mode blague Louis
            </span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              Quiz sur /login · Claudette muette pour lui
            </span>
          </span>
        </label>
      </section>

      {(message || error) && (
        <div className="flex flex-wrap gap-3 text-sm">
          {message && (
            <p className="text-accent" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="text-ink-muted" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

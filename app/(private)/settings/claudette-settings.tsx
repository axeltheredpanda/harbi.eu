"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { buttonClass } from "@/frontend/components/button-variants";
import { updateClaudetteSettings } from "@/backend/claudette/settings";
import {
  EMPTY_PROFILE,
  PROFILE_FIELDS,
  type ClaudetteProfile,
  type ClaudetteSettings,
} from "@/backend/claudette/profile";

type Props = {
  initial: ClaudetteSettings;
};

export function ClaudetteSettingsSection({ initial }: Props) {
  const dialogId = useId();
  const [webSearch, setWebSearch] = useState(initial.webSearchEnabled);
  const [profile, setProfile] = useState<ClaudetteProfile>(initial.profile);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [importOpen, setImportOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!importOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setImportOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [importOpen]);

  function setField(key: keyof ClaudetteProfile, value: string) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const next = await updateClaudetteSettings({
          webSearchEnabled: webSearch,
          profile,
        });
        setWebSearch(next.webSearchEnabled);
        setProfile(next.profile);
        setMessage("Claudette settings saved — she’ll use them on the next reply.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t save");
      }
    });
  }

  async function handleImport() {
    setImportError(null);
    setImporting(true);
    try {
      const res = await fetch("/api/claudette/parse-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paste, existing: profile }),
      });
      const data = (await res.json()) as {
        error?: string;
        profile?: ClaudetteProfile;
      };
      if (!res.ok || !data.profile) {
        setImportError(data.error ?? "Import failed");
        return;
      }
      setProfile({ ...EMPTY_PROFILE, ...data.profile });
      setImportOpen(false);
      setPaste("");
      setMessage(
        "Fields filled from your paste — review them, then hit Save Claudette.",
      );
    } catch {
      setImportError("Network error while parsing");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSave}
        className="space-y-6 border-t border-border pt-10"
      >
        <div className="space-y-3">
          <h2 className="font-display text-xl font-medium text-ink">
            Claudette
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Who you are to her, how she should talk, and whether she may look
            things up online. Profile facts are used only when they help the
            current question — she won’t dump your bio unprompted.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 border border-border px-4 py-3">
          <input
            type="checkbox"
            checked={webSearch}
            onChange={(e) => setWebSearch(e.target.checked)}
            className="mt-1 accent-[var(--color-accent)]"
          />
          <span>
            <span className="block font-display text-base text-ink">
              Allow web search
            </span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              Claudette can search the live web for news, docs, prices. Personal
              facts still come from this profile. (Sonnet / Opus — not Haiku.)
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={buttonClass("secondary")}
            onClick={() => {
              setImportError(null);
              setImportOpen(true);
            }}
          >
            Paste Claude memory…
          </button>
          <p className="text-xs text-ink-faint">
            Drop a long memory dump — she’ll map it into the fields below.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILE_FIELDS.map((field) => (
            <label
              key={field.key}
              className={`block space-y-1.5 ${field.rows && field.rows > 1 ? "sm:col-span-2" : ""}`}
            >
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                {field.label}
              </span>
              {field.rows && field.rows > 1 ? (
                <textarea
                  value={profile[field.key]}
                  onChange={(e) => setField(field.key, e.target.value)}
                  rows={field.rows}
                  placeholder={field.hint}
                  className="w-full border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
                />
              ) : (
                <input
                  type="text"
                  value={profile[field.key]}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.hint}
                  className="w-full border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
                />
              )}
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={buttonClass("primary")}
          >
            {pending ? "Saving…" : "Save Claudette"}
          </button>
          {message && (
            <p className="text-sm text-accent" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm text-ink" role="alert">
              {error}
            </p>
          )}
        </div>
      </form>

      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => !importing && setImportOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogId}
            className="max-h-[90vh] w-full max-w-xl overflow-auto border border-border bg-canvas p-5 shadow-sm sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id={dialogId}
              className="font-display text-xl font-medium text-ink"
            >
              Import profile paste
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Paste the raw memory export from Claude (or any notes). Claudette
              will sort it into the fields — you review and save.
            </p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={14}
              placeholder="Paste here…"
              className="mt-4 w-full border border-border bg-surface/40 px-3 py-2 font-mono text-xs leading-relaxed text-ink"
              autoFocus
            />
            {importError && (
              <p className="mt-2 text-sm text-ink" role="alert">
                {importError}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass("primary")}
                disabled={importing || !paste.trim()}
                onClick={() => void handleImport()}
              >
                {importing ? "Reading…" : "Fill fields"}
              </button>
              <button
                type="button"
                className={buttonClass("ghost")}
                disabled={importing}
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

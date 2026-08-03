"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  createMemoryManual,
  deleteMemory,
  updateMemory,
  type Memory,
} from "@/backend/chat/memories";
import { buttonClass } from "@/frontend/components/button-variants";

type Props = {
  initial: Memory[];
};

type Drafts = Record<string, { title: string; content: string }>;

const CATEGORIES: Array<Memory["category"]> = [
  "personal",
  "projects",
  "preferences",
  "ongoing",
  "other",
];

const CATEGORY_LABELS: Record<Memory["category"], string> = {
  personal: "Personal",
  projects: "Projects",
  preferences: "Preferences",
  ongoing: "Ongoing",
  other: "Other",
};

function initialDrafts(memories: Memory[]): Drafts {
  return Object.fromEntries(
    memories.map((memory) => [
      memory.id,
      { title: memory.title, content: memory.content },
    ]),
  );
}

function formatTouched(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MemoryPanel({ initial }: Props) {
  const [memories, setMemories] = useState(initial);
  const [drafts, setDrafts] = useState<Drafts>(() => initialDrafts(initial));
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    title: string;
    content: string;
    category: Memory["category"];
    sensitive: boolean;
    pinned: boolean;
  }>({
    title: "",
    content: "",
    category: "preferences",
    sensitive: false,
    pinned: false,
  });
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      memories: memories.filter((memory) => memory.category === category),
    }));
  }, [memories]);

  function setBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function updateDraft(id: string, patch: Partial<Drafts[string]>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        title: prev[id]?.title ?? "",
        content: prev[id]?.content ?? "",
        ...patch,
      },
    }));
  }

  function saveMemory(memory: Memory) {
    const draft = drafts[memory.id];
    if (!draft) return;
    const title = draft.title.trim() || "Untitled";
    const content = draft.content.trim();
    if (title === memory.title && content === memory.content) return;

    setMessage(null);
    setError(null);
    setBusy(memory.id, true);
    startTransition(async () => {
      try {
        const updated = await updateMemory(memory.id, { title, content });
        setMemories((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        setDrafts((prev) => ({
          ...prev,
          [updated.id]: { title: updated.title, content: updated.content },
        }));
        setMessage("Memory saved.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save memory");
      } finally {
        setBusy(memory.id, false);
      }
    });
  }

  function toggleSensitivePin(memory: Memory) {
    if (!memory.sensitive) return;
    setMessage(null);
    setError(null);
    setBusy(memory.id, true);
    startTransition(async () => {
      try {
        const updated = await updateMemory(memory.id, {
          pinned: !memory.pinned,
        });
        setMemories((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        setMessage(updated.pinned ? "Sensitive memory pinned." : "Sensitive memory unpinned.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update memory");
      } finally {
        setBusy(memory.id, false);
      }
    });
  }

  function removeMemory(memory: Memory) {
    if (!window.confirm(`Delete "${memory.title}"?`)) return;
    setMessage(null);
    setError(null);
    setBusy(memory.id, true);
    startTransition(async () => {
      try {
        await deleteMemory(memory.id);
        setMemories((prev) => prev.filter((item) => item.id !== memory.id));
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[memory.id];
          return next;
        });
        setMessage("Memory deleted.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete memory");
      } finally {
        setBusy(memory.id, false);
      }
    });
  }

  function createManualMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      setError("Add a title and content before creating a memory.");
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const created = await createMemoryManual({
          title,
          content,
          category: form.category,
          sensitive: form.sensitive,
          pinned: form.sensitive ? form.pinned : false,
        });
        setMemories((prev) => [created, ...prev]);
        setDrafts((prev) => ({
          ...prev,
          [created.id]: { title: created.title, content: created.content },
        }));
        setForm({
          title: "",
          content: "",
          category: form.category,
          sensitive: false,
          pinned: false,
        });
        setMessage("Manual memory created.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create memory");
      }
    });
  }

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          Claudette memory
        </p>
        <div className="max-w-prose space-y-2">
          <h2 className="font-display text-2xl font-medium text-ink">
            Durable notes
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Claudette can extract durable preferences and project context after
            a few assistant turns. Extraction is async, so new facts may appear
            here after the conversation has moved on.
          </p>
          <p className="rounded-sm border border-border bg-surface/60 px-3 py-2 text-xs leading-relaxed text-ink-muted">
            Health details, precise financial information, credentials, and
            account numbers are not auto-stored. Add anything sensitive manually
            only if you want to control it here.
          </p>
        </div>
      </div>

      <form
        onSubmit={createManualMemory}
        className="rounded-md border border-border bg-surface/50 p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-display text-lg font-medium text-ink">
                Add a manual memory
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Use this for stable preferences or context Claudette should keep
                across threads.
              </p>
            </div>
            <select
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  category: event.target.value as Memory["category"],
                }))
              }
              className="rounded-sm border border-border bg-canvas px-2 py-1.5 font-mono text-xs text-ink"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Title"
              className="rounded-sm border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
            <input
              value={form.content}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, content: event.target.value }))
              }
              placeholder="What should Claudette remember?"
              className="rounded-sm border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
              <input
                type="checkbox"
                checked={form.sensitive}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sensitive: event.target.checked,
                    pinned: event.target.checked ? prev.pinned : false,
                  }))
                }
                className="accent-[var(--color-accent)]"
              />
              sensitive
            </label>
            {form.sensitive ? (
              <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, pinned: event.target.checked }))
                  }
                  className="accent-[var(--color-accent)]"
                />
                pin into prompt
              </label>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className={buttonClass("secondary", "ml-auto")}
            >
              create memory
            </button>
          </div>
        </div>
      </form>

      {message ? (
        <p className="text-sm text-accent" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}

      {memories.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface/40 p-6">
          <h3 className="font-display text-lg font-medium text-ink">
            No memories yet
          </h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
            Keep chatting normally. Claudette reviews recent turns in the
            background every few assistant replies and stores only durable,
            useful facts. You can also add one manually above.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, memories: categoryMemories }) => {
            if (categoryMemories.length === 0) return null;
            return (
              <section key={category} className="space-y-3">
                <div className="flex items-baseline gap-2 border-b border-border pb-2">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {categoryMemories.length}
                  </span>
                </div>

                <div className="grid gap-3">
                  {categoryMemories.map((memory) => {
                    const draft = drafts[memory.id] ?? {
                      title: memory.title,
                      content: memory.content,
                    };
                    const busy = busyIds.has(memory.id);
                    const dirty =
                      draft.title.trim() !== memory.title ||
                      draft.content.trim() !== memory.content;

                    return (
                      <article
                        key={memory.id}
                        className="rounded-md border border-border bg-canvas p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <input
                              value={draft.title}
                              onChange={(event) =>
                                updateDraft(memory.id, {
                                  title: event.target.value,
                                })
                              }
                              onBlur={() => saveMemory(memory)}
                              disabled={busy}
                              className="w-full rounded-sm border border-transparent bg-transparent px-0 py-1 font-display text-lg font-medium text-ink transition-colors focus:border-border focus:bg-surface/40 focus:px-2"
                            />
                            <textarea
                              value={draft.content}
                              onChange={(event) =>
                                updateDraft(memory.id, {
                                  content: event.target.value,
                                })
                              }
                              onBlur={() => saveMemory(memory)}
                              disabled={busy}
                              rows={3}
                              className="w-full resize-y rounded-sm border border-transparent bg-transparent px-0 py-1 text-sm leading-relaxed text-ink-muted transition-colors focus:border-border focus:bg-surface/40 focus:px-2"
                            />
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                            {memory.sensitive ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleSensitivePin(memory)}
                                className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors disabled:opacity-40 ${
                                  memory.pinned
                                    ? "border-accent bg-accent-soft text-accent"
                                    : "border-border text-ink-faint hover:text-ink"
                                }`}
                              >
                                {memory.pinned ? "pinned" : "pin sensitive"}
                              </button>
                            ) : (
                              <span className="rounded-sm border border-border/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                                included
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={busy || !dirty}
                              onClick={() => saveMemory(memory)}
                              className="rounded-sm border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint transition-colors hover:text-ink disabled:opacity-35"
                            >
                              save
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeMemory(memory)}
                              className="rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint transition-colors hover:bg-accent-soft hover:text-accent disabled:opacity-35"
                            >
                              delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                          {memory.sensitive ? <span>sensitive</span> : null}
                          {memory.source_conversation_id ? (
                            <span>from chat</span>
                          ) : (
                            <span>manual</span>
                          )}
                          <time dateTime={memory.last_touched_at}>
                            touched {formatTouched(memory.last_touched_at)}
                          </time>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

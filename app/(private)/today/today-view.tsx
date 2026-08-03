"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { JarvisNote } from "@/backend/jarvis/notes";
import { JARVIS_ASK_PHRASES } from "@/backend/jarvis/constants";
import { buttonClass } from "@/frontend/components/button-variants";
import { createNote } from "@/backend/jarvis/notes";

type SearchHit = {
  id: string;
  title: string;
  excerpt: string;
  auto_tags: string[];
  score: number;
};

type Citation = { id: string; title: string };

type Props = {
  briefing: string | null;
  recent: JarvisNote[];
  resurfaced: JarvisNote | null;
  dailyNoteId: string | null;
};

function parseSseChunk(chunk: string): { event: string; data: string }[] {
  const events: { event: string; data: string }[] = [];
  const parts = chunk.split("\n\n");
  for (const part of parts) {
    if (!part.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) events.push({ event, data: dataLines.join("\n") });
  }
  return events;
}

export function TodayView({
  briefing,
  recent,
  resurfaced,
  dailyNoteId,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"idle" | "search" | "ask">("idle");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [busy, setBusy] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => {
      setPhraseIdx((i) => (i + 1) % JARVIS_ASK_PHRASES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [busy]);

  async function runSearch(q: string) {
    setBusy(true);
    setMode("search");
    setError(null);
    setAnswer("");
    setCitations([]);
    try {
      const res = await fetch("/api/jarvis/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await res.json()) as { hits?: SearchHit[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setHits(data.hits ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function runAsk(q: string) {
    setBusy(true);
    setMode("ask");
    setError(null);
    setHits([]);
    setAnswer("");
    setCitations([]);
    setPhraseIdx(0);
    try {
      const res = await fetch("/api/jarvis/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Ask failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          for (const evt of parseSseChunk(chunk + "\n\n")) {
            const payload = JSON.parse(evt.data) as {
              text?: string;
              notes?: Citation[];
              message?: string;
            };
            if (evt.event === "citations" && payload.notes) {
              setCitations(payload.notes);
            }
            if (evt.event === "delta" && payload.text) {
              assembled += payload.text;
              setAnswer(assembled);
            }
            if (evt.event === "error") {
              throw new Error(payload.message ?? "Ask failed");
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || busy) return;
    void runAsk(q);
  }

  async function onNewNote() {
    const note = await createNote({ title: "Untitled" });
    router.push(`/today/notes/${note.id}`);
  }

  const renderedAnswer = renderCitations(answer, citations);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-14">
      <header className="space-y-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          Jarvis · today
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Today
        </h1>
        <p className="max-w-prose font-display text-xl leading-snug tracking-tight text-ink sm:text-2xl sm:leading-snug">
          {briefing ??
            "No briefing yet — it lands once a day after the notes settle."}
        </p>
      </header>

      <section className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="sr-only" htmlFor="jarvis-ask">
            Ask Claudette about your notes
          </label>
          <input
            ref={inputRef}
            id="jarvis-ask"
            value={query}
            disabled={busy}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Claudette…"
            className="w-full border border-border bg-canvas px-4 py-3 font-display text-lg text-ink placeholder:text-ink-faint focus:border-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={busy || !query.trim()}
              className={buttonClass("primary")}
            >
              Ask
            </button>
            <button
              type="button"
              disabled={busy || !query.trim()}
              className={buttonClass("secondary", "text-xs")}
              onClick={() => void runSearch(query.trim())}
            >
              Search notes
            </button>
            <button
              type="button"
              className={buttonClass("ghost", "text-xs")}
              onClick={() => void onNewNote()}
            >
              New note
            </button>
            {dailyNoteId && (
              <Link
                href={`/today/notes/${dailyNoteId}`}
                className={buttonClass("ghost", "text-xs")}
              >
                Daily note
              </Link>
            )}
          </div>
        </form>

        {busy && (
          <p className="font-mono text-[11px] text-ink-faint">
            {JARVIS_ASK_PHRASES[phraseIdx]}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-warn">
            {error}
          </p>
        )}

        {mode === "ask" && answer && (
          <div className="space-y-3 border-t border-border pt-6">
            <div className="prose-jarvis text-base leading-relaxed text-ink">
              {renderedAnswer}
            </div>
            {citations.length > 0 && (
              <p className="font-mono text-[10px] text-ink-faint">
                Sources ·{" "}
                {citations.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 ? " · " : ""}
                    <Link
                      href={`/today/notes/${c.id}`}
                      className="text-ink-muted hover:text-accent"
                    >
                      {c.title}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}

        {mode === "search" && (
          <ul className="divide-y divide-border border-t border-border">
            {hits.length === 0 ? (
              <li className="py-4 text-sm text-ink-muted">No matches.</li>
            ) : (
              hits.map((hit) => (
                <li key={hit.id} className="py-4">
                  <Link
                    href={`/today/notes/${hit.id}`}
                    className="font-display text-lg text-ink hover:text-accent"
                  >
                    {hit.title}
                  </Link>
                  <p className="mt-1 text-sm text-ink-muted">{hit.excerpt}</p>
                  {hit.auto_tags?.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {hit.auto_tags.map((tag) => (
                        <span
                          key={tag}
                          className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-ink-faint"
                        >
                          {tag}
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      {resurfaced && (
        <section className="space-y-2 border-t border-border pt-10">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
            From the shelf
          </p>
          <Link
            href={`/today/notes/${resurfaced.id}`}
            className="block font-display text-xl text-ink hover:text-accent"
          >
            {resurfaced.title}
          </Link>
          <p className="text-sm text-ink-muted">
            {resurfaced.auto_summary ||
              resurfaced.content.slice(0, 180) ||
              "An older note, still breathing."}
          </p>
        </section>
      )}

      <section className="space-y-4 border-t border-border pt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-medium text-ink">
            Recent notes
          </h2>
          <Link
            href="/today/graph"
            className="font-mono text-[11px] text-ink-faint hover:text-accent"
          >
            Graph
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No notes yet — capture a daily page or start a blank one.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((note) => (
              <li key={note.id} className="flex flex-col gap-1 py-3">
                <Link
                  href={`/today/notes/${note.id}`}
                  className="font-display text-lg text-ink hover:text-accent"
                >
                  {note.title}
                  {note.is_daily_note ? (
                    <span className="ml-2 font-mono text-[10px] text-ink-faint">
                      daily
                    </span>
                  ) : null}
                </Link>
                {note.auto_tags?.length > 0 && (
                  <p className="flex flex-wrap gap-1.5">
                    {note.auto_tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-ink-faint"
                      >
                        {tag}
                      </span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function renderCitations(text: string, citations: Citation[]): ReactNode[] {
  const byId = new Map(citations.map((c) => [c.id, c]));
  const parts: ReactNode[] = [];
  const re = /\[\[note:([0-9a-f-]{36})\]\]/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const id = match[1]!;
    const cite = byId.get(id);
    parts.push(
      <Link
        key={`c-${key++}`}
        href={`/today/notes/${id}`}
        className="align-super font-mono text-[10px] text-ink-faint hover:text-accent"
        title={cite?.title ?? "Source note"}
      >
        [{cite?.title?.slice(0, 18) ?? "note"}]
      </Link>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

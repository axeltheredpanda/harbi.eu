"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useEffectEvent } from "react";
import {
  JARVIS_PROCESS_DEBOUNCE_MS,
  JARVIS_PROCESSING_PHRASES,
} from "@/backend/jarvis/constants";
import {
  deleteNote,
  updateNote,
  type JarvisNote,
  type NoteLinkRef,
} from "@/backend/jarvis/notes";
import { buttonClass } from "@/frontend/components/button-variants";
import { useRouter } from "next/navigation";

type Props = {
  note: JarvisNote;
  backlinks: NoteLinkRef[];
};

export function NoteEditor({ note, backlinks }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.auto_tags ?? []);
  const [summary, setSummary] = useState(note.auto_summary);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const processRef = useRef<number | null>(null);
  const lastProcessedHash = useRef<string | null>(note.content_hash);

  useEffect(() => {
    if (!processing) return;
    const id = window.setInterval(() => {
      setPhraseIdx((i) => (i + 1) % JARVIS_PROCESSING_PHRASES.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [processing]);

  const persist = useEffectEvent(async (nextTitle: string, nextContent: string) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateNote(note.id, {
        title: nextTitle,
        content: nextContent,
      });
      lastProcessedHash.current = null; // content changed — needs process
      void updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  });

  const process = useEffectEvent(async () => {
    setProcessing(true);
    setPhraseIdx(0);
    try {
      const res = await fetch("/api/jarvis/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id }),
      });
      const data = (await res.json()) as {
        skipped?: boolean;
        auto_tags?: string[];
        auto_summary?: string | null;
        content_hash?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Process failed");
      if (data.auto_tags) setTags(data.auto_tags);
      if (data.auto_summary !== undefined) setSummary(data.auto_summary);
      if (data.content_hash) lastProcessedHash.current = data.content_hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Process failed");
    } finally {
      setProcessing(false);
    }
  });

  function schedule(nextTitle: string, nextContent: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (processRef.current) window.clearTimeout(processRef.current);

    debounceRef.current = window.setTimeout(() => {
      void persist(nextTitle, nextContent);
    }, 600);

    processRef.current = window.setTimeout(() => {
      void process();
    }, JARVIS_PROCESS_DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (processRef.current) window.clearTimeout(processRef.current);
    };
  }, []);

  async function onDelete() {
    if (!window.confirm("Delete this note?")) return;
    await deleteNote(note.id);
    router.push("/today");
  }

  return (
    <div className="space-y-6">
      <input
        value={title}
        onChange={(e) => {
          const v = e.target.value;
          setTitle(v);
          schedule(v, content);
        }}
        className="w-full border-0 bg-transparent font-display text-3xl font-medium tracking-tight text-ink outline-none placeholder:text-ink-faint"
        placeholder="Title"
      />
      <textarea
        value={content}
        onChange={(e) => {
          const v = e.target.value;
          setContent(v);
          schedule(title, v);
        }}
        rows={18}
        placeholder="Write freely. Use [[Note title]] for wiki links."
        className="w-full resize-y border border-border bg-canvas px-4 py-3 font-body text-base leading-relaxed text-ink placeholder:text-ink-faint"
      />

      <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
        <span className="font-mono text-[11px] text-ink-faint">
          {saving ? "saving…" : processing ? JARVIS_PROCESSING_PHRASES[phraseIdx] : "synced"}
        </span>
        <button type="button" className={buttonClass("ghost", "text-xs")} onClick={onDelete}>
          Delete
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}

      {summary && (
        <p className="border-t border-border pt-4 text-sm leading-relaxed text-ink-muted">
          {summary}
        </p>
      )}

      {tags.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-ink-faint"
            >
              {tag}
            </span>
          ))}
        </p>
      )}

      <section className="space-y-2 border-t border-border pt-6">
        <h2 className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
          Backlinks
        </h2>
        {backlinks.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing points here yet — other notes can link with [[
            {title || "this title"}]].
          </p>
        ) : (
          <ul className="space-y-1">
            {backlinks.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/today/notes/${b.id}`}
                  className="text-sm text-ink hover:text-accent"
                >
                  {b.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

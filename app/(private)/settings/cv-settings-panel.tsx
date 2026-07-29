"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { buttonClass } from "@/frontend/components/button-variants";
import {
  clearMilestoneImage,
  createMilestone,
  deleteMilestone,
  reorderMilestones,
  saveMilestoneDraft,
  setMilestonePublished,
  uploadMilestoneImage,
} from "@/backend/cv/milestones";
import type { CvMilestone, CvMilestoneInput } from "@/backend/cv/types";
import { milestoneImageUrl } from "@/frontend/cv/milestone-image";

type Props = {
  initial: CvMilestone[];
};

function emptyForm(): CvMilestoneInput {
  return {
    period: "",
    title: "",
    place: "",
    summary: "",
  };
}

function toForm(row: CvMilestone): CvMilestoneInput {
  const title = row.title_en || row.title_fr;
  const place = row.place_en || row.place_fr;
  const summary = row.summary_en || row.summary_fr;
  return {
    period: row.period === "—" ? "" : row.period,
    title: title === "New milestone" || title === "Nouveau jalon" ? "" : title,
    place,
    summary: summary === "…" ? "" : summary,
  };
}

function formFingerprint(form: CvMilestoneInput): string {
  return JSON.stringify(form);
}

export function CvSettingsPanel({ initial }: Props) {
  const [items, setItems] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial[0]?.id ?? null,
  );
  const [form, setForm] = useState<CvMilestoneInput>(() =>
    initial[0] ? toForm(initial[0]) : emptyForm(),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragOverLogo, setDragOverLogo] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const savedFingerprint = useRef(formFingerprint(form));
  const formRef = useRef(form);
  const selectedRef = useRef(selectedId);

  formRef.current = form;
  selectedRef.current = selectedId;

  const selected = selectedId
    ? items.find((item) => item.id === selectedId) ?? null
    : null;
  const previewImage = selected ? milestoneImageUrl(selected.image_path) : null;

  const selectRow = useCallback((row: CvMilestone) => {
    setSelectedId(row.id);
    const next = toForm(row);
    setForm(next);
    savedFingerprint.current = formFingerprint(next);
    setError(null);
    setStatus(null);
  }, []);

  // Debounced autosave
  useEffect(() => {
    if (!selectedId) return;
    const fp = formFingerprint(form);
    if (fp === savedFingerprint.current) return;

    const timer = window.setTimeout(() => {
      const id = selectedRef.current;
      const payload = formRef.current;
      if (!id) return;
      startTransition(async () => {
        try {
          const updated = await saveMilestoneDraft(id, payload);
          savedFingerprint.current = formFingerprint(payload);
          setItems((prev) =>
            prev.map((item) => (item.id === id ? updated : item)),
          );
          setStatus("Draft saved");
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Autosave failed");
        }
      });
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [form, selectedId]);

  function handleNew() {
    setError(null);
    startTransition(async () => {
      try {
        const created = await createMilestone();
        setItems((prev) => [...prev, created]);
        selectRow(created);
        setStatus("Draft created");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t create");
      }
    });
  }

  function handleDelete() {
    if (!selectedId || !selected) return;
    if (!window.confirm("Delete this milestone?")) return;
    startTransition(async () => {
      try {
        await deleteMilestone(selectedId);
        const next = items.filter((item) => item.id !== selectedId);
        setItems(next);
        if (next[0]) selectRow(next[0]);
        else {
          setSelectedId(null);
          setForm(emptyForm());
        }
        setStatus("Deleted");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t delete");
      }
    });
  }

  function handlePublish(publish: boolean) {
    if (!selectedId) return;
    startTransition(async () => {
      try {
        // Flush current form first
        await saveMilestoneDraft(selectedId, formRef.current);
        savedFingerprint.current = formFingerprint(formRef.current);
        const updated = await setMilestonePublished(selectedId, publish);
        setItems((prev) =>
          prev.map((item) => (item.id === selectedId ? updated : item)),
        );
        setStatus(publish ? "Published on the landing" : "Back to draft");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Publish failed");
      }
    });
  }

  function move(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    setItems(next);
    startTransition(async () => {
      try {
        await reorderMilestones(next.map((item) => item.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t reorder");
        setItems(initial);
      }
    });
  }

  function onListDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const from = items.findIndex((item) => item.id === draggingId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) {
      setDraggingId(null);
      return;
    }
    const next = [...items];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row!);
    setItems(next);
    setDraggingId(null);
    startTransition(async () => {
      try {
        await reorderMilestones(next.map((item) => item.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t reorder");
        setItems(initial);
      }
    });
  }

  function uploadLogo(file: File | null) {
    if (!selectedId || !file) return;
    const data = new FormData();
    data.set("file", file);
    startTransition(async () => {
      try {
        const updated = await uploadMilestoneImage(selectedId, data);
        setItems((prev) =>
          prev.map((item) => (item.id === selectedId ? updated : item)),
        );
        setStatus("Logo uploaded");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function clearLogo() {
    if (!selectedId) return;
    startTransition(async () => {
      try {
        const updated = await clearMilestoneImage(selectedId);
        setItems((prev) =>
          prev.map((item) => (item.id === selectedId ? updated : item)),
        );
        setStatus("Logo removed");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t remove logo");
      }
    });
  }

  const fieldClass =
    "mt-1 w-full border border-border bg-canvas px-3 py-2 font-body text-sm text-ink outline-none focus:border-accent";
  const labelClass = "block text-xs font-medium text-ink-muted";

  const previewTitle = form.title || "Title";
  const previewPlace = form.place;
  const previewSummary = form.summary || "Summary…";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-medium text-ink">
            CV timeline
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Drafts autosave. Publish explicitly to show a milestone on the
            public frise. Drag rows to reorder.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={handleNew}
          className={buttonClass("primary")}
        >
          + New milestone
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        {/* List */}
        <div className="border border-border bg-surface/40">
          <ul className="divide-y divide-border">
            {items.length === 0 && (
              <li className="px-4 py-6 font-mono text-xs text-ink-faint">
                No milestones yet.
              </li>
            )}
            {items.map((item, index) => {
              const active = item.id === selectedId;
              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggingId(item.id)}
                  onDragOver={(e: DragEvent) => {
                    e.preventDefault();
                  }}
                  onDrop={(e: DragEvent) => {
                    e.preventDefault();
                    onListDrop(item.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={`group ${
                    draggingId === item.id ? "opacity-50" : ""
                  }`}
                >
                  <div
                    className={`flex items-start gap-1 ${
                      active ? "bg-accent-soft/70" : "hover:bg-surface-hover/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectRow(item)}
                      className="min-w-0 flex-1 px-3 py-3 text-left"
                    >
                      <p className="font-mono text-[10px] tracking-wide text-ink-faint">
                        {item.period}
                        <span
                          className={
                            item.published
                              ? "text-accent"
                              : "text-ink-faint"
                          }
                        >
                          {" · "}
                          {item.published ? "published" : "draft"}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-sm text-ink">
                        {item.title_en || item.title_fr || "Untitled"}
                      </p>
                    </button>
                    <div className="flex flex-col py-2 pr-2 opacity-70 group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={pending || index === 0}
                        onClick={() => move(item.id, -1)}
                        className="px-1 font-mono text-[10px] text-ink-muted hover:text-ink disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={pending || index === items.length - 1}
                        onClick={() => move(item.id, 1)}
                        className="px-1 font-mono text-[10px] text-ink-muted hover:text-ink disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Editor */}
        <div className="min-w-0 space-y-5 border border-border bg-canvas p-5 sm:p-6">
          {!selected ? (
            <p className="font-mono text-xs text-ink-faint">
              Select a milestone or create one.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p
                  className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
                    selected.published ? "text-accent" : "text-ink-faint"
                  }`}
                >
                  {selected.published ? "Published" : "Draft"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.published ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handlePublish(false)}
                      className={buttonClass("secondary")}
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handlePublish(true)}
                      className={buttonClass("primary")}
                    >
                      Publish
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={handleDelete}
                    className={buttonClass("ghost")}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <label className={labelClass}>
                Period
                <input
                  className={fieldClass}
                  value={form.period}
                  onChange={(e) =>
                    setForm({ ...form, period: e.target.value })
                  }
                  placeholder="2024—2025 or 2026—"
                />
              </label>

              <label className={labelClass}>
                Title
                <input
                  className={fieldClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <label className={labelClass}>
                Location
                <input
                  className={fieldClass}
                  value={form.place}
                  onChange={(e) => setForm({ ...form, place: e.target.value })}
                />
              </label>

              <label className={labelClass}>
                Summary
                <textarea
                  className={`${fieldClass} min-h-[6rem] resize-y`}
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                />
              </label>

              <div>
                <p className={`${labelClass} mb-2`}>Logo</p>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverLogo(true);
                  }}
                  onDragLeave={() => setDragOverLogo(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverLogo(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) uploadLogo(file);
                  }}
                  className={`flex flex-col items-center justify-center gap-3 border border-dashed px-4 py-6 transition-colors ${
                    dragOverLogo
                      ? "border-accent bg-accent-soft/50"
                      : "border-border bg-surface/30"
                  }`}
                >
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt=""
                      className="h-12 w-auto max-w-[7rem] object-contain"
                    />
                  ) : (
                    <p className="text-xs text-ink-faint">
                      Drop an image, or choose a file
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer font-mono text-xs text-accent hover:text-accent-strong">
                      Choose file
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        className="sr-only"
                        disabled={pending}
                        onChange={(e) => {
                          uploadLogo(e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {previewImage && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={clearLogo}
                        className="font-mono text-xs text-ink-faint hover:text-ink"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Live mini-preview */}
              <div className="border border-border bg-accent-soft/40 px-4 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  Timeline preview
                </p>
                <div className="relative mt-5 mb-6 h-px w-full bg-border">
                  <div className="absolute inset-y-0 left-0 w-1/3 bg-accent" />
                  <span className="absolute top-1/2 left-1/3 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent" />
                  <span className="absolute top-1/2 left-[8%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
                  <span className="absolute top-1/2 left-[66%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-faint bg-canvas" />
                </div>
                <p className="font-mono text-[11px] tracking-wide text-ink-faint">
                  {form.period || "Period"}
                </p>
                <div className="mt-2 flex items-start gap-3">
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt=""
                      className="mt-0.5 h-7 w-auto max-w-[3rem] object-contain"
                    />
                  ) : null}
                  <div>
                    <p className="font-display text-lg text-ink">{previewTitle}</p>
                    {previewPlace ? (
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {previewPlace}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {previewSummary}
                </p>
              </div>

              <div className="flex min-h-[1.25rem] flex-wrap gap-3 text-sm">
                {status && (
                  <p className="text-accent" role="status">
                    {pending ? "Saving…" : status}
                  </p>
                )}
                {error && (
                  <p className="text-ink-muted" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

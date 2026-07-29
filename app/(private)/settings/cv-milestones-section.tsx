"use client";

import { useRef, useState, useTransition } from "react";
import { buttonClass } from "@/frontend/components/button-variants";
import {
  clearMilestoneImage,
  createMilestone,
  deleteMilestone,
  reorderMilestones,
  setMilestonePublished,
  updateMilestone,
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
    titleFr: "",
    titleEn: "",
    placeFr: "",
    placeEn: "",
    summaryFr: "",
    summaryEn: "",
    published: false,
  };
}

function toForm(row: CvMilestone): CvMilestoneInput {
  return {
    period: row.period,
    titleFr: row.title_fr,
    titleEn: row.title_en,
    placeFr: row.place_fr,
    placeEn: row.place_en,
    summaryFr: row.summary_fr,
    summaryEn: row.summary_en,
    published: row.published,
  };
}

export function CvMilestonesSection({ initial }: Props) {
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState<CvMilestoneInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const editing = editingId
    ? items.find((item) => item.id === editingId) ?? null
    : null;
  const previewImage = editing ? milestoneImageUrl(editing.image_path) : null;

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(row: CvMilestone) {
    setEditingId(row.id);
    setForm(toForm(row));
    setMessage(null);
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateMilestone(editingId, form);
          setItems((prev) =>
            prev.map((item) => (item.id === editingId ? updated : item)),
          );
          setMessage("Milestone saved.");
        } else {
          const created = await createMilestone(form);
          setItems((prev) => [...prev, created]);
          setEditingId(created.id);
          setForm(toForm(created));
          setMessage("Milestone created — you can add a logo now.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t save");
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this milestone?")) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await deleteMilestone(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (editingId === id) resetForm();
        setMessage("Deleted.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t delete");
      }
    });
  }

  function handleTogglePublished(row: CvMilestone) {
    setError(null);
    startTransition(async () => {
      try {
        const next = !row.published;
        await setMilestonePublished(row.id, next);
        setItems((prev) =>
          prev.map((item) =>
            item.id === row.id ? { ...item, published: next } : item,
          ),
        );
        if (editingId === row.id) {
          setForm((f) => ({ ...f, published: next }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t update");
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

  function handleUpload(file: File | null) {
    if (!editingId || !file) return;
    setError(null);
    const data = new FormData();
    data.set("file", file);
    startTransition(async () => {
      try {
        const updated = await uploadMilestoneImage(editingId, data);
        setItems((prev) =>
          prev.map((item) => (item.id === editingId ? updated : item)),
        );
        setMessage("Logo uploaded.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function handleClearImage() {
    if (!editingId) return;
    startTransition(async () => {
      try {
        const updated = await clearMilestoneImage(editingId);
        setItems((prev) =>
          prev.map((item) => (item.id === editingId ? updated : item)),
        );
        setMessage("Logo removed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn’t remove logo");
      }
    });
  }

  const fieldClass =
    "mt-1 w-full border border-border bg-canvas px-3 py-2 font-body text-sm text-ink outline-none focus:border-accent";
  const labelClass = "block text-xs font-medium text-ink-muted";

  return (
    <section className="space-y-6 border-t border-border pt-10">
      <header className="space-y-2">
        <h2 className="font-display text-xl font-medium text-ink">
          CV timeline
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Milestones for the public horizontal CV. Order is left → right on the
          landing. Only published rows appear publicly. FR and EN are both
          required.
        </p>
      </header>

      <ul className="divide-y divide-border border-y border-border">
        {items.length === 0 && (
          <li className="py-4 font-mono text-xs text-ink-faint">
            No milestones yet — add the first below.
          </li>
        )}
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-wrap items-baseline justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-wide text-ink-faint">
                {item.period}
                {item.published ? (
                  <span className="text-accent"> · published</span>
                ) : (
                  <span> · draft</span>
                )}
              </p>
              <p className="truncate text-sm text-ink">{item.title_fr}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending || index === 0}
                onClick={() => move(item.id, -1)}
                className="font-mono text-xs text-ink-muted hover:text-ink disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={pending || index === items.length - 1}
                onClick={() => move(item.id, 1)}
                className="font-mono text-xs text-ink-muted hover:text-ink disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleTogglePublished(item)}
                className="font-mono text-xs text-ink-muted hover:text-accent"
              >
                {item.published ? "Unpublish" : "Publish"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startEdit(item)}
                className="font-mono text-xs text-accent hover:text-accent-strong"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(item.id)}
                className="font-mono text-xs text-ink-faint hover:text-ink"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-lg text-ink">
            {editingId ? "Edit milestone" : "New milestone"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="font-mono text-xs text-ink-faint hover:text-ink"
            >
              New instead
            </button>
          )}
        </div>

        <label className={labelClass}>
          Period
          <input
            className={fieldClass}
            value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
            placeholder="2024—2025"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-3">
            <legend className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              Français
            </legend>
            <label className={labelClass}>
              Title
              <input
                className={fieldClass}
                value={form.titleFr}
                onChange={(e) => setForm({ ...form, titleFr: e.target.value })}
                required
              />
            </label>
            <label className={labelClass}>
              Place
              <input
                className={fieldClass}
                value={form.placeFr}
                onChange={(e) => setForm({ ...form, placeFr: e.target.value })}
              />
            </label>
            <label className={labelClass}>
              Summary
              <textarea
                className={`${fieldClass} min-h-[5.5rem] resize-y`}
                value={form.summaryFr}
                onChange={(e) =>
                  setForm({ ...form, summaryFr: e.target.value })
                }
                required
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              English
            </legend>
            <label className={labelClass}>
              Title
              <input
                className={fieldClass}
                value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                required
              />
            </label>
            <label className={labelClass}>
              Place
              <input
                className={fieldClass}
                value={form.placeEn}
                onChange={(e) => setForm({ ...form, placeEn: e.target.value })}
              />
            </label>
            <label className={labelClass}>
              Summary
              <textarea
                className={`${fieldClass} min-h-[5.5rem] resize-y`}
                value={form.summaryEn}
                onChange={(e) =>
                  setForm({ ...form, summaryEn: e.target.value })
                }
                required
              />
            </label>
          </fieldset>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={Boolean(form.published)}
            onChange={(e) =>
              setForm({ ...form, published: e.target.checked })
            }
          />
          Published on the public CV
        </label>

        {editingId && (
          <div className="space-y-3 border border-border bg-surface/50 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Logo
            </p>
            {previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt=""
                className="h-12 w-auto max-w-[8rem] object-contain"
              />
            ) : (
              <p className="text-xs text-ink-faint">No logo yet.</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                disabled={pending}
                onChange={(e) =>
                  handleUpload(e.target.files?.[0] ?? null)
                }
                className="text-xs text-ink-muted"
              />
              {previewImage && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleClearImage}
                  className="font-mono text-xs text-ink-faint hover:text-ink"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border border-dashed border-border bg-canvas px-4 py-5">
          <p className="font-mono text-[11px] tracking-wide text-ink-faint">
            Preview · {form.period || "—"}
          </p>
          <p className="mt-2 font-display text-xl text-ink">
            {form.titleFr || "Titre"}
          </p>
          {form.placeFr ? (
            <p className="mt-1 text-sm text-ink-muted">{form.placeFr}</p>
          ) : null}
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
            {form.summaryFr || "Résumé FR…"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={buttonClass("primary")}
          >
            {pending ? "Saving…" : editingId ? "Save milestone" : "Create"}
          </button>
          {message && (
            <p className="text-sm text-accent" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm text-ink-muted" role="alert">
              {error}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

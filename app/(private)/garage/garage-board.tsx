"use client";

import { useMemo, useState, useTransition } from "react";
import { buttonClass } from "@/frontend/components/button-variants";
import {
  createVehicle,
  deleteVehicle,
  updateVehicle,
  type Vehicle,
  type VehicleInput,
} from "@/backend/vehicles";

type SortKey = "price" | "mileage" | "year" | "created";

type Props = {
  initialVehicles: Vehicle[];
};

function emptyForm(): VehicleInput {
  return {
    title: "",
    price: null,
    mileage: null,
    year: null,
    url: null,
    note: null,
  };
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function GarageBoard({ initialVehicles }: Props) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [sort, setSort] = useState<SortKey>("price");
  const [form, setForm] = useState<VehicleInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sorted = useMemo(() => {
    const copy = [...vehicles];
    copy.sort((a, b) => {
      if (sort === "created") {
        return b.created_at.localeCompare(a.created_at);
      }
      const av = a[sort];
      const bv = b[sort];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av - bv;
    });
    return copy;
  }, [vehicles, sort]);

  function startEdit(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setForm({
      title: vehicle.title,
      price: vehicle.price,
      mileage: vehicle.mileage,
      year: vehicle.year,
      url: vehicle.url,
      note: vehicle.note,
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (editingId) {
          await updateVehicle(editingId, form);
          setVehicles((prev) =>
            prev.map((v) =>
              v.id === editingId
                ? {
                    ...v,
                    ...form,
                    title: form.title.trim(),
                    updated_at: new Date().toISOString(),
                  }
                : v,
            ),
          );
        } else {
          const created = await createVehicle(form);
          setVehicles((prev) => [created, ...prev]);
        }
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteVehicle(id);
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        if (editingId === id) resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="font-mono text-sm text-accent">~/garage</p>
        <h1 className="mt-1 font-display text-2xl font-medium text-ink">
          Vehicle search
        </h1>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">
          Manual tracker for candidate listings — price, mileage, year, link, and a
          personal note.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-md border border-border bg-surface p-4 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-mono text-[11px] text-ink-faint">Title / model</span>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="rounded-sm border border-border bg-canvas px-3 py-2 text-ink"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-[11px] text-ink-faint">Price (€)</span>
          <input
            inputMode="numeric"
            value={form.price ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, price: parseOptionalInt(e.target.value) }))
            }
            className="rounded-sm border border-border bg-canvas px-3 py-2 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-[11px] text-ink-faint">Mileage (km)</span>
          <input
            inputMode="numeric"
            value={form.mileage ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, mileage: parseOptionalInt(e.target.value) }))
            }
            className="rounded-sm border border-border bg-canvas px-3 py-2 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-[11px] text-ink-faint">Year</span>
          <input
            inputMode="numeric"
            value={form.year ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, year: parseOptionalInt(e.target.value) }))
            }
            className="rounded-sm border border-border bg-canvas px-3 py-2 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-[11px] text-ink-faint">Listing URL</span>
          <input
            type="url"
            value={form.url ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            className="rounded-sm border border-border bg-canvas px-3 py-2 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-mono text-[11px] text-ink-faint">Note / rating</span>
          <textarea
            rows={2}
            value={form.note ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="rounded-sm border border-border bg-canvas px-3 py-2 text-ink"
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {editingId ? "Save changes" : "Add listing"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className={buttonClass("secondary")}
            >
              Cancel
            </button>
          )}
        </div>
        {error && <p className="font-mono text-xs text-ink-muted sm:col-span-2">{error}</p>}
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] text-ink-faint">Sort</span>
        {(
          [
            ["price", "Price"],
            ["mileage", "Mileage"],
            ["year", "Year"],
            ["created", "Added"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            className={`font-mono text-xs ${
              sort === key ? "text-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {sorted.map((vehicle) => (
          <li key={vehicle.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-lg text-ink">{vehicle.title}</p>
              <p className="mt-1 font-mono text-xs text-ink-faint">
                {[
                  vehicle.year != null ? String(vehicle.year) : null,
                  vehicle.price != null ? `${vehicle.price.toLocaleString("fr-FR")} €` : null,
                  vehicle.mileage != null
                    ? `${vehicle.mileage.toLocaleString("fr-FR")} km`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No details yet"}
              </p>
              {vehicle.note && (
                <p className="mt-2 max-w-prose text-sm text-ink-muted">{vehicle.note}</p>
              )}
              {vehicle.url && (
                <a
                  href={vehicle.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-underline mt-2 inline-block text-sm"
                >
                  Open listing
                </a>
              )}
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => startEdit(vehicle)}
                className="font-mono text-xs text-ink-muted hover:text-ink"
              >
                edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(vehicle.id)}
                className="font-mono text-xs text-ink-muted hover:text-ink"
              >
                delete
              </button>
            </div>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="py-6 font-mono text-sm text-ink-faint">No listings yet.</li>
        )}
      </ul>
    </div>
  );
}

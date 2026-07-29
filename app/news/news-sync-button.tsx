"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/frontend/components/button-variants";

/** Manual sync — works when logged in (owner) + service role configured. */
export function NewsSyncButton() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function sync() {
    setNote(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/news/sync", { method: "POST" });
        const data = (await res.json()) as {
          error?: string;
          upserted?: number;
          errors?: { feedId: string; message: string }[];
        };
        if (!res.ok) {
          setNote(data.error ?? "Sync failed");
          return;
        }
        const failed = data.errors?.length ?? 0;
        setNote(
          failed > 0
            ? `Synced ~${data.upserted ?? 0} items (${failed} feed error${failed > 1 ? "s" : ""}). Refresh.`
            : `Synced ~${data.upserted ?? 0} items. Refresh the page.`,
        );
      } catch {
        setNote("Network error");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={buttonClass("secondary", "text-xs")}
        disabled={pending}
        onClick={sync}
      >
        {pending ? "Syncing feeds…" : "Sync feeds now"}
      </button>
      {note && (
        <p className="text-xs text-ink-muted" role="status">
          {note}
        </p>
      )}
    </div>
  );
}

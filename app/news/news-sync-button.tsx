"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/frontend/components/button-variants";

/** Manual sync for logged-in owner — free, no cron plan needed. */
export function NewsSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function sync() {
    setNote(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/news/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
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
            ? `Synced ~${data.upserted ?? 0} (${failed} feed error${failed > 1 ? "s" : ""})`
            : `Synced ~${data.upserted ?? 0} items`,
        );
        router.refresh();
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
        {pending ? "Syncing…" : "Sync now"}
      </button>
      {note && (
        <p className="text-xs text-ink-muted" role="status">
          {note}
        </p>
      )}
    </div>
  );
}

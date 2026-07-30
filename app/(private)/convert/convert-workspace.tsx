"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonClass } from "@/frontend/components/button-variants";
import {
  DEFAULT_QUALITY,
  MAX_CONVERT_BATCH,
  MAX_CONVERT_UPLOAD_BYTES,
  OUTPUT_LABEL,
  badgeExt,
  type InputFormat,
  type OutputFormat,
} from "@/backend/convert/constants";
import { convertImageFile } from "@/frontend/convert/convert";
import {
  defaultOutputFor,
  detectInputFormat,
  formatBytes,
  replaceExtension,
  sizeDeltaLabel,
} from "@/frontend/convert/formats";
import {
  loadConvertHistory,
  pushConvertHistory,
  type ConvertHistoryItem,
} from "@/frontend/convert/history";
import { downloadBlob, downloadFilesAsZip } from "@/frontend/convert/zip";
import { ConvertDropZone } from "./drop-zone";
import { FormatFlipBadge } from "./format-flip-badge";

type ItemStatus = "ready" | "converting" | "done" | "error";

type QueueItem = {
  id: string;
  file: File;
  thumbUrl: string;
  sourceFormat: InputFormat;
  targetFormat: OutputFormat;
  status: ItemStatus;
  progress: number;
  error?: string;
  resultBlob?: Blob;
  resultUrl?: string;
  outputBytes?: number;
};

type GlobalSettings = {
  quality: number;
  width: string;
  height: string;
};

function parseDim(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function ConvertWorkspace() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings>({
    quality: DEFAULT_QUALITY,
    width: "",
    height: "",
  });
  const [history, setHistory] = useState<ConvertHistoryItem[]>([]);

  useEffect(() => {
    setHistory(loadConvertHistory());
  }, []);

  useEffect(() => {
    return () => {
      for (const item of items) {
        URL.revokeObjectURL(item.thumbUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke on unmount only
  }, []);

  const addFiles = useCallback((files: File[]) => {
    setError(null);
    setItems((prev) => {
      const room = MAX_CONVERT_BATCH - prev.length;
      if (room <= 0) {
        setError(`Batch capped at ${MAX_CONVERT_BATCH} files.`);
        return prev;
      }
      const next: QueueItem[] = [];
      for (const file of files.slice(0, room)) {
        if (file.size > MAX_CONVERT_UPLOAD_BYTES) {
          setError(
            `Skipped oversized file (max ${Math.floor(MAX_CONVERT_UPLOAD_BYTES / (1024 * 1024))} MB).`,
          );
          continue;
        }
        const sourceFormat = detectInputFormat(file);
        next.push({
          id: crypto.randomUUID(),
          file,
          thumbUrl: URL.createObjectURL(file),
          sourceFormat,
          targetFormat: defaultOutputFor(sourceFormat),
          status: "ready",
          progress: 0,
        });
      }
      return [...prev, ...next];
    });
  }, []);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (busy) return;
      const list = event.clipboardData?.items;
      if (!list) return;
      const files: File[] = [];
      for (const item of list) {
        if (item.type.startsWith("image/") || item.type === "") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) {
        event.preventDefault();
        addFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [busy, addFiles]);

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.thumbUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }

  function clearAll() {
    for (const item of items) {
      URL.revokeObjectURL(item.thumbUrl);
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    }
    setItems([]);
    setError(null);
  }

  async function runConvert() {
    const pending = items.filter(
      (i) => i.status === "ready" || i.status === "error",
    );
    if (!pending.length) return;

    setBusy(true);
    setError(null);
    const width = parseDim(settings.width);
    const height = parseDim(settings.height);

    for (const item of pending) {
      updateItem(item.id, {
        status: "converting",
        progress: 0.05,
        error: undefined,
      });
      try {
        const result = await convertImageFile({
          file: item.file,
          format: item.targetFormat,
          quality: settings.quality,
          width,
          height,
          onProgress: (ratio) => updateItem(item.id, { progress: ratio }),
        });
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        const resultUrl = URL.createObjectURL(result.blob);
        updateItem(item.id, {
          status: "done",
          progress: 1,
          resultBlob: result.blob,
          resultUrl,
          outputBytes: result.blob.size,
          sourceFormat: result.sourceFormat,
        });
        setHistory(
          pushConvertHistory({
            filename: item.file.name || "image",
            sourceFormat: result.sourceFormat,
            targetFormat: item.targetFormat,
            inputBytes: item.file.size,
            outputBytes: result.blob.size,
          }),
        );
      } catch (err) {
        updateItem(item.id, {
          status: "error",
          progress: 0,
          error:
            err instanceof Error ? err.message : "Conversion failed",
        });
      }
    }

    setBusy(false);
  }

  async function downloadOne(item: QueueItem) {
    if (!item.resultBlob) return;
    await downloadBlob(
      item.resultBlob,
      replaceExtension(item.file.name || "converted", item.targetFormat),
    );
  }

  async function downloadZip() {
    const done = items.filter((i) => i.resultBlob);
    if (done.length < 2) return;
    await downloadFilesAsZip(
      done.map((i) => ({
        filename: replaceExtension(i.file.name || "converted", i.targetFormat),
        blob: i.resultBlob!,
      })),
    );
  }

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <header className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          Private · in-browser · free
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Convert
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          Drop images that refuse to open elsewhere - HEIC from the phone,
          TIFF from the archive, WebP from the web. They leave speaking a
          format everyone understands. Nothing uploads; the pixels stay on
          this machine.
        </p>
      </header>

      <section className="space-y-4">
        <ConvertDropZone disabled={busy} onFiles={addFiles}>
          {items.length === 0 ? (
            <>
              <p className="font-display text-xl text-ink">
                Files that finally speak the right dialect
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
                Drop a stack, click to browse, or paste with{" "}
                <kbd className="font-mono text-xs text-ink">Ctrl</kbd>+
                <kbd className="font-mono text-xs text-ink">V</kbd>
              </p>
              <p className="font-mono text-[11px] text-ink-faint">
                PNG · JPG · WebP · AVIF · GIF · BMP · TIFF · HEIC · max{" "}
                {Math.floor(MAX_CONVERT_UPLOAD_BYTES / (1024 * 1024))} MB
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-lg text-ink">Add more images</p>
              <p className="font-mono text-[11px] text-ink-faint">
                {items.length}/{MAX_CONVERT_BATCH} in the queue
              </p>
            </>
          )}
        </ConvertDropZone>

        {error && (
          <p
            role="alert"
            className="border border-border bg-accent-soft/50 px-4 py-3 text-sm text-ink"
          >
            {error}
          </p>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="font-mono text-[11px] uppercase tracking-wide text-ink-faint hover:text-ink"
                onClick={() => setAdvancedOpen((v) => !v)}
                aria-expanded={advancedOpen}
              >
                {advancedOpen ? "Hide" : "Advanced"} settings
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={buttonClass("ghost", "text-xs")}
                  disabled={busy}
                  onClick={clearAll}
                >
                  Clear
                </button>
                {doneCount >= 2 && (
                  <button
                    type="button"
                    className={buttonClass("secondary", "text-xs")}
                    disabled={busy}
                    onClick={() => void downloadZip()}
                  >
                    Download all as zip
                  </button>
                )}
                <button
                  type="button"
                  className={buttonClass("primary")}
                  disabled={busy || items.every((i) => i.status === "done")}
                  onClick={() => void runConvert()}
                >
                  {busy ? "Converting…" : "Convert"}
                </button>
              </div>
            </div>

            {advancedOpen && (
              <div className="space-y-4 border border-border bg-surface/40 px-4 py-4">
                <label className="block space-y-2">
                  <span className="flex justify-between font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                    Quality
                    <span className="text-ink-muted">
                      {Math.round(settings.quality * 100)}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={Math.round(settings.quality * 100)}
                    disabled={busy}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        quality: Number(e.target.value) / 100,
                      }))
                    }
                    className="w-full accent-[var(--color-accent)]"
                  />
                  <p className="text-xs text-ink-faint">
                    Applies to JPG, WebP, and AVIF output.
                  </p>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                      Width px
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="auto"
                      value={settings.width}
                      disabled={busy}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, width: e.target.value }))
                      }
                      className="w-full border border-border bg-canvas px-3 py-2 font-mono text-sm text-ink"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                      Height px
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="auto"
                      value={settings.height}
                      disabled={busy}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, height: e.target.value }))
                      }
                      className="w-full border border-border bg-canvas px-3 py-2 font-mono text-sm text-ink"
                    />
                  </label>
                </div>
                <p className="text-xs text-ink-faint">
                  Leave blank to keep original size. One side alone keeps
                  aspect ratio.
                </p>
              </div>
            )}

            <ul className="divide-y divide-border border border-border">
              {items.map((item) => {
                const delta =
                  item.status === "done" && item.outputBytes != null
                    ? sizeDeltaLabel(item.file.size, item.outputBytes)
                    : null;
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden border border-border bg-surface">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.resultUrl ?? item.thumbUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm text-ink">
                          {item.file.name || "untitled"}
                        </p>
                        <p className="font-mono text-[11px] text-ink-faint">
                          {badgeExt(item.sourceFormat)} ·{" "}
                          {formatBytes(item.file.size)}
                          {item.status === "done" && item.outputBytes != null
                            ? ` → ${formatBytes(item.outputBytes)}`
                            : ""}
                        </p>
                        {delta && (
                          <p
                            className={`font-mono text-[11px] ${
                              delta.saved ? "text-accent" : "text-warn"
                            }`}
                          >
                            {delta.text}
                          </p>
                        )}
                        {item.status === "converting" && (
                          <div
                            className="h-0.5 w-full overflow-hidden bg-border"
                            role="progressbar"
                            aria-valuenow={Math.round(item.progress * 100)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full bg-accent transition-[width] duration-150 ease-out"
                              style={{
                                width: `${Math.max(4, Math.round(item.progress * 100))}%`,
                              }}
                            />
                          </div>
                        )}
                        {item.status === "error" && (
                          <p className="text-xs text-warn">{item.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="font-mono text-[10px] text-ink-faint">
                        {badgeExt(item.sourceFormat)}
                      </span>
                      <span className="text-ink-faint" aria-hidden>
                        →
                      </span>
                      <FormatFlipBadge
                        value={item.targetFormat}
                        disabled={busy || item.status === "converting"}
                        onChange={(format) =>
                          updateItem(item.id, {
                            targetFormat: format,
                            status:
                              item.status === "done" ? "ready" : item.status,
                            resultBlob: undefined,
                            resultUrl: undefined,
                            outputBytes: undefined,
                            progress: 0,
                          })
                        }
                      />
                      {item.status === "done" && (
                        <button
                          type="button"
                          className={buttonClass("secondary", "text-xs")}
                          onClick={() => void downloadOne(item)}
                        >
                          Download
                        </button>
                      )}
                      <button
                        type="button"
                        className={buttonClass("ghost", "text-xs")}
                        disabled={busy}
                        onClick={() => removeItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-medium text-ink">
            Recent
          </h2>
          <p className="font-mono text-[11px] text-ink-faint">
            this browser only
          </p>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing on the shelf yet - conversions you finish will leave a
            quiet paper trail here.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {history.map((item) => (
              <li
                key={item.id}
                className="border border-border px-3 py-3 transition-colors hover:border-accent"
              >
                <p className="truncate font-mono text-[11px] text-ink">
                  {item.filename}
                </p>
                <p className="mt-1 font-mono text-[10px] text-accent">
                  {badgeExt(item.sourceFormat).replace(".", "")} →{" "}
                  {OUTPUT_LABEL[item.targetFormat]}
                </p>
                <p className="mt-2 font-mono text-[10px] text-ink-faint">
                  {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                  {formatBytes(item.inputBytes)} →{" "}
                  {formatBytes(item.outputBytes)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

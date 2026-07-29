"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass } from "@/frontend/components/button-variants";
import {
  ALLOWED_BG_MIME,
  CUTOUT_PROCESSING_PHRASES,
  CUTOUT_WARMUP_PHRASE,
  MAX_BG_UPLOAD_BYTES,
  type CutoutMode,
} from "@/backend/cutout/constants";
import {
  removeBackgroundInBrowser,
  sha256Hex,
} from "@/frontend/cutout/remove-background";
import { CompareSlider } from "./compare-slider";
import { DropZone } from "./drop-zone";

type HistoryItem = {
  id: string;
  mode: CutoutMode;
  createdAt: string;
  originalName: string | null;
  originalUrl: string | null;
  resultUrl: string | null;
};

type ResultState = {
  id: string;
  originalUrl: string;
  resultUrl: string;
  originalName: string | null;
  mode: CutoutMode;
  localPreview?: string;
};

type FillMode = "transparent" | "solid" | "blur";

type Props = {
  initialHistory: HistoryItem[];
};

function validateFile(file: File): string | null {
  if (!ALLOWED_BG_MIME.has(file.type)) {
    return "Use PNG, JPEG, WebP, or GIF.";
  }
  if (file.size > MAX_BG_UPLOAD_BYTES) {
    return `Too large — max ${Math.floor(MAX_BG_UPLOAD_BYTES / (1024 * 1024))} MB.`;
  }
  return null;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn’t load image"));
    img.src = src;
  });
}

async function composeExport(
  resultUrl: string,
  originalUrl: string,
  fill: FillMode,
  solidColor: string,
): Promise<Blob> {
  const cutout = await loadImage(resultUrl);
  const canvas = document.createElement("canvas");
  canvas.width = cutout.naturalWidth;
  canvas.height = cutout.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  if (fill === "solid") {
    ctx.fillStyle = solidColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (fill === "blur") {
    const original = await loadImage(originalUrl);
    ctx.filter = "blur(18px)";
    ctx.drawImage(original, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
  }

  ctx.drawImage(cutout, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      "image/png",
    );
  });
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function CutoutWorkspace({ initialHistory }: Props) {
  const [mode, setMode] = useState<CutoutMode>("fast");
  const [busy, setBusy] = useState(false);
  const [warming, setWarming] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [fill, setFill] = useState<FillMode>("transparent");
  const [solidColor, setSolidColor] = useState("#faf6f0");
  const [showFillMenu, setShowFillMenu] = useState(false);
  const abortWarm = useRef<number | null>(null);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/remove-bg/history");
      if (!res.ok) return;
      const data = (await res.json()) as { items: HistoryItem[] };
      setHistory(data.items ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => {
      setPhraseIdx((i) => (i + 1) % CUTOUT_PROCESSING_PHRASES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [busy]);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (busy) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            void processFiles([file]);
          }
          break;
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- processFiles closed over mode/busy
  }, [busy, mode]);

  async function processFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    const validation = validateFile(file);
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    setBusy(true);
    setWarming(false);
    setPhraseIdx(0);
    setShowFillMenu(false);
    setFill("transparent");

    const localPreview = URL.createObjectURL(file);
    if (abortWarm.current) window.clearTimeout(abortWarm.current);
    abortWarm.current = window.setTimeout(() => setWarming(true), 2500);

    try {
      const contentHash = await sha256Hex(file);

      // Cache lookup (no result yet)
      const lookupForm = new FormData();
      lookupForm.append("file", file);
      lookupForm.append("mode", mode);
      lookupForm.append("contentHash", contentHash);
      const lookupRes = await fetch("/api/remove-bg", {
        method: "POST",
        body: lookupForm,
      });
      const lookup = (await lookupRes.json()) as {
        error?: string;
        cached?: boolean;
        needsProcessing?: boolean;
        id?: string;
        originalUrl?: string | null;
        resultUrl?: string | null;
        originalName?: string | null;
        mode?: CutoutMode;
      };

      if (!lookupRes.ok) {
        setError(lookup.error ?? "Something went sideways. Try again.");
        return;
      }

      if (
        lookup.cached &&
        lookup.id &&
        lookup.originalUrl &&
        lookup.resultUrl
      ) {
        setResult({
          id: lookup.id,
          originalUrl: lookup.originalUrl,
          resultUrl: lookup.resultUrl,
          originalName: lookup.originalName ?? file.name,
          mode: lookup.mode ?? mode,
          localPreview,
        });
        void refreshHistory();
        return;
      }

      // Process in the browser (ONNX) — no external service
      const resultBlob = await removeBackgroundInBrowser(file, mode);

      const storeForm = new FormData();
      storeForm.append("file", file);
      storeForm.append(
        "result",
        new File([resultBlob], "result.png", { type: "image/png" }),
      );
      storeForm.append("mode", mode);
      storeForm.append("contentHash", contentHash);

      const storeRes = await fetch("/api/remove-bg", {
        method: "POST",
        body: storeForm,
      });
      const data = (await storeRes.json()) as {
        error?: string;
        id?: string;
        originalUrl?: string | null;
        resultUrl?: string | null;
        originalName?: string | null;
        mode?: CutoutMode;
      };

      if (!storeRes.ok || !data.resultUrl || !data.originalUrl || !data.id) {
        const localResult = URL.createObjectURL(resultBlob);
        setResult({
          id: "local",
          originalUrl: localPreview,
          resultUrl: localResult,
          originalName: file.name,
          mode,
          localPreview,
        });
        setError(
          data.error ??
            "Cutout worked, but saving to history failed. You can still download.",
        );
        return;
      }

      setResult({
        id: data.id,
        originalUrl: data.originalUrl,
        resultUrl: data.resultUrl,
        originalName: data.originalName ?? file.name,
        mode: data.mode ?? mode,
        localPreview,
      });
      void refreshHistory();
    } catch (err) {
      console.error(err);
      setError(
        "Couldn’t remove the background. Try a smaller image, or refresh and retry.",
      );
    } finally {
      if (abortWarm.current) window.clearTimeout(abortWarm.current);
      setBusy(false);
      setWarming(false);
    }
  }

  async function handleDownload() {
    if (!result) return;
    try {
      const blob = await composeExport(
        result.resultUrl,
        result.originalUrl,
        fill,
        solidColor,
      );
      const base = (result.originalName ?? "cutout").replace(/\.[^.]+$/, "");
      const suffix =
        fill === "transparent" ? "cutout" : fill === "blur" ? "blur" : "solid";
      downloadBlob(blob, `${base}-${suffix}.png`);
    } catch {
      setError("Download failed — try opening the result in a new tab.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <header className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          Private · in-browser · free
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Cutout
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          Drop a photo, paste a screenshot, or pick a file. The background
          leaves — no watermark, no credit card, just pixels negotiating their
          exit.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
              Mode
            </span>
            <div className="inline-flex border border-border">
              {(
                [
                  {
                    id: "fast" as const,
                    label: "Fast",
                    tip: "Quicker pass — good for drafts and simple subjects. Lower fidelity, lower latency.",
                  },
                  {
                    id: "quality" as const,
                    label: "Quality",
                    tip: "Slower, sharper edges — better for hair, glass, and fiddly silhouettes. Worth the wait when it matters.",
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  title={option.tip}
                  disabled={busy}
                  onClick={() => setMode(option.id)}
                  className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                    mode === option.id
                      ? "bg-accent text-canvas"
                      : "bg-canvas text-ink-muted hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span
              className="hidden text-sm text-ink-faint sm:inline"
              title="Hover Fast / Quality for the tradeoff."
            >
              hover a mode for the tradeoff
            </span>
          </div>
        </div>

        <DropZone disabled={busy} onFiles={(files) => void processFiles(files)}>
          <p className="font-display text-xl text-ink">Drop an image here</p>
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
            or click to browse · or paste with{" "}
            <kbd className="font-mono text-xs text-ink">Ctrl</kbd>+
            <kbd className="font-mono text-xs text-ink">V</kbd>
          </p>
          <p className="font-mono text-[11px] text-ink-faint">
            PNG · JPEG · WebP · GIF · max{" "}
            {Math.floor(MAX_BG_UPLOAD_BYTES / (1024 * 1024))} MB
          </p>
        </DropZone>

        {error && (
          <p
            role="alert"
            className="border border-border bg-accent-soft/50 px-4 py-3 text-sm text-ink"
          >
            {error}
          </p>
        )}

        {busy && (
          <div className="flex items-center gap-3 border border-border bg-surface/60 px-4 py-3">
            <span
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent"
              aria-hidden
            />
            <p className="text-sm text-ink-muted chat-crossfade-in">
              {warming
                ? CUTOUT_WARMUP_PHRASE
                : CUTOUT_PROCESSING_PHRASES[phraseIdx]}
            </p>
          </div>
        )}
      </section>

      {result && !busy && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-medium text-ink">
                Result
              </h2>
              <p className="mt-1 font-mono text-[11px] text-ink-faint">
                {result.mode === "quality" ? "Quality" : "Fast"} · drag the
                handle to compare
              </p>
            </div>
            <div className="relative flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={buttonClass("primary")}
                onClick={() => void handleDownload()}
              >
                Download PNG
              </button>
              <div className="relative">
                <button
                  type="button"
                  className={buttonClass("secondary", "text-xs")}
                  onClick={() => setShowFillMenu((v) => !v)}
                  aria-expanded={showFillMenu}
                >
                  Background ▾
                </button>
                {showFillMenu && (
                  <div className="absolute right-0 z-20 mt-1 w-56 border border-border bg-canvas p-2 shadow-sm">
                    <button
                      type="button"
                      className={`block w-full px-2 py-1.5 text-left text-sm ${
                        fill === "transparent"
                          ? "text-accent"
                          : "text-ink-muted hover:text-ink"
                      }`}
                      onClick={() => {
                        setFill("transparent");
                        setShowFillMenu(false);
                      }}
                    >
                      Transparent (default)
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-2 py-1.5 text-left text-sm ${
                        fill === "solid"
                          ? "text-accent"
                          : "text-ink-muted hover:text-ink"
                      }`}
                      onClick={() => setFill("solid")}
                    >
                      Solid color
                    </button>
                    {fill === "solid" && (
                      <label className="mt-1 flex items-center gap-2 px-2 py-1 text-xs text-ink-muted">
                        Color
                        <input
                          type="color"
                          value={solidColor}
                          onChange={(e) => setSolidColor(e.target.value)}
                          className="h-6 w-8 cursor-pointer border border-border bg-transparent"
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      className={`mt-1 block w-full px-2 py-1.5 text-left text-sm ${
                        fill === "blur"
                          ? "text-accent"
                          : "text-ink-muted hover:text-ink"
                      }`}
                      onClick={() => {
                        setFill("blur");
                        setShowFillMenu(false);
                      }}
                    >
                      Blurred original
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <CompareSlider
            beforeSrc={result.localPreview ?? result.originalUrl}
            afterSrc={result.resultUrl}
          />
          {fill !== "transparent" && (
            <p className="text-sm text-ink-faint">
              Download will bake in a{" "}
              {fill === "blur" ? "blurred backdrop" : "solid fill"} — the slider
              still shows the transparent cutout.
            </p>
          )}
        </section>
      )}

      <section className="space-y-4 border-t border-border pt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-medium text-ink">
            Recent
          </h2>
          <p className="font-mono text-[11px] text-ink-faint">
            kept in your private storage
          </p>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing here yet — your first cutout will land in this shelf.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!item.resultUrl || !item.originalUrl}
                  onClick={() => {
                    if (!item.resultUrl || !item.originalUrl) return;
                    setResult({
                      id: item.id,
                      originalUrl: item.originalUrl,
                      resultUrl: item.resultUrl,
                      originalName: item.originalName,
                      mode: item.mode,
                    });
                    setFill("transparent");
                    setError(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="group w-full overflow-hidden border border-border text-left transition-colors hover:border-accent"
                >
                  <div
                    className="aspect-square w-full"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #d4cbc0 25%, transparent 25%), linear-gradient(-45deg, #d4cbc0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4cbc0 75%), linear-gradient(-45deg, transparent 75%, #d4cbc0 75%)",
                      backgroundSize: "12px 12px",
                      backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
                      backgroundColor: "#f3ede4",
                    }}
                  >
                    {item.resultUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.resultUrl}
                        alt={item.originalName ?? "Cutout"}
                        className="h-full w-full object-contain"
                      />
                    ) : null}
                  </div>
                  <p className="truncate px-2 py-1.5 font-mono text-[10px] text-ink-faint group-hover:text-ink-muted">
                    {item.mode === "quality" ? "Quality" : "Fast"} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

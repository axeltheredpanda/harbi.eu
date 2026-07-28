export const BG_STORAGE_BUCKET = "bg-removals";

/** Client + server hard cap for uploads. */
export const MAX_BG_UPLOAD_BYTES = 12 * 1024 * 1024;

export const ALLOWED_BG_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type CutoutMode = "fast" | "quality";

export const CUTOUT_PROCESSING_PHRASES = [
  "tracing the edges…",
  "negotiating with the background…",
  "asking the pixels politely to leave…",
  "finding where the subject ends…",
  "sanding the silhouette…",
  "convincing the backdrop to retire…",
  "almost clean…",
  "tucking the alpha channel in…",
] as const;

export const CUTOUT_WARMUP_PHRASE =
  "loading the model — first run can take a moment…";

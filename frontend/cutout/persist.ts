import { createClient } from "@/frontend/supabase/client";
import {
  ALLOWED_BG_MIME,
  BG_STORAGE_BUCKET,
  MAX_BG_UPLOAD_BYTES,
  type CutoutMode,
} from "@/backend/cutout/constants";

export type CutoutPersisted = {
  id: string;
  mode: CutoutMode;
  createdAt: string;
  originalName: string | null;
  originalUrl: string;
  resultUrl: string;
  cached: boolean;
  contentHash: string;
};

function extensionFor(mime: string, filename: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  const fromName = filename.split(".").pop();
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : "bin";
}

/** Cache lookup - JSON only, no image bytes through Vercel. */
export async function lookupCutoutCache(
  contentHash: string,
  mode: CutoutMode,
): Promise<CutoutPersisted | null> {
  const res = await fetch("/api/remove-bg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "lookup", contentHash, mode }),
  });
  const data = (await res.json()) as CutoutPersisted & {
    error?: string;
    needsProcessing?: boolean;
  };
  if (!res.ok) {
    throw new Error(data.error ?? "Cache lookup failed");
  }
  if (
    data.cached &&
    data.id &&
    data.originalUrl &&
    data.resultUrl
  ) {
    return data;
  }
  return null;
}

/**
 * Upload original + result straight to Supabase Storage from the browser,
 * then record the row via a small JSON API (avoids Vercel's ~4.5 MB body limit).
 */
export async function persistCutout(opts: {
  file: File;
  result: Blob;
  mode: CutoutMode;
  contentHash: string;
  durationMs: number;
}): Promise<CutoutPersisted> {
  const { file, result, mode, contentHash, durationMs } = opts;

  if (!ALLOWED_BG_MIME.has(file.type)) {
    throw new Error("Use PNG, JPEG, WebP, or GIF");
  }
  if (file.size <= 0 || file.size > MAX_BG_UPLOAD_BYTES) {
    throw new Error(
      `File too large (max ${Math.floor(MAX_BG_UPLOAD_BYTES / (1024 * 1024))} MB)`,
    );
  }
  if (result.size <= 0) {
    throw new Error("Empty result");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const id = crypto.randomUUID();
  const ext = extensionFor(file.type, file.name);
  const originalPath = `${user.id}/${id}/original.${ext}`;
  const resultPath = `${user.id}/${id}/result.png`;

  const { error: originalError } = await supabase.storage
    .from(BG_STORAGE_BUCKET)
    .upload(originalPath, file, { contentType: file.type, upsert: false });
  if (originalError) {
    throw new Error(originalError.message);
  }

  const { error: resultError } = await supabase.storage
    .from(BG_STORAGE_BUCKET)
    .upload(resultPath, result, { contentType: "image/png", upsert: false });
  if (resultError) {
    await supabase.storage.from(BG_STORAGE_BUCKET).remove([originalPath]);
    throw new Error(resultError.message);
  }

  try {
    const res = await fetch("/api/remove-bg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        contentHash,
        mode,
        originalName: file.name || null,
        originalPath,
        resultPath,
        durationMs,
      }),
    });
    const data = (await res.json()) as CutoutPersisted & { error?: string };
    if (!res.ok || !data.originalUrl || !data.resultUrl || !data.id) {
      throw new Error(data.error ?? "Failed to save cutout history");
    }
    return data;
  } catch (err) {
    await supabase.storage
      .from(BG_STORAGE_BUCKET)
      .remove([originalPath, resultPath]);
    throw err;
  }
}

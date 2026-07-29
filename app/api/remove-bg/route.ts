import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import {
  ALLOWED_BG_MIME,
  BG_STORAGE_BUCKET,
  MAX_BG_UPLOAD_BYTES,
  type CutoutMode,
} from "@/backend/cutout/constants";

function parseMode(value: FormDataEntryValue | null): CutoutMode {
  return value === "fast" ? "fast" : "quality";
}

function extensionFor(mime: string, filename: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  const fromName = filename.split(".").pop();
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : "bin";
}

/**
 * Store a client-processed cutout (or return a cache hit).
 *
 * Cache lookup: FormData with `file` + `mode` only (no `result`).
 * Store: FormData with `file` + `result` + `mode` + optional `contentHash`.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const resultFile = form.get("result");
  const mode = parseMode(form.get("mode"));
  const providedHash = String(form.get("contentHash") ?? "").trim();
  const durationRaw = Number(form.get("durationMs"));
  const durationMs =
    Number.isFinite(durationRaw) && durationRaw >= 0
      ? Math.round(durationRaw)
      : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BG_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `File too large (max ${Math.floor(MAX_BG_UPLOAD_BYTES / (1024 * 1024))} MB)`,
      },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_BG_MIME.has(mime)) {
    return NextResponse.json(
      { error: "Use PNG, JPEG, WebP, or GIF" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { createHash } = await import("node:crypto");
  const contentHash =
    providedHash && /^[a-f0-9]{64}$/i.test(providedHash)
      ? providedHash.toLowerCase()
      : createHash("sha256").update(buffer).digest("hex");

  // Always check cache first
  const { data: cached } = await supabase
    .from("bg_removals")
    .select("id, mode, created_at, original_name, original_path, result_path")
    .eq("user_id", user.id)
    .eq("content_hash", contentHash)
    .eq("mode", mode)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    const [{ data: originalSigned }, { data: resultSigned }] = await Promise.all([
      supabase.storage
        .from(BG_STORAGE_BUCKET)
        .createSignedUrl(cached.original_path, 60 * 60),
      supabase.storage
        .from(BG_STORAGE_BUCKET)
        .createSignedUrl(cached.result_path, 60 * 60),
    ]);
    if (originalSigned?.signedUrl && resultSigned?.signedUrl) {
      const { recordServiceEvent } = await import("@/backend/analytics/record");
      await recordServiceEvent({
        userId: user.id,
        service: "cutout",
        kind: "info",
        detail: "cache_hit",
        durationMs: 0,
        meta: { mode, contentHash },
      });

      return NextResponse.json({
        id: cached.id,
        mode: cached.mode,
        createdAt: cached.created_at,
        originalName: cached.original_name,
        originalUrl: originalSigned.signedUrl,
        resultUrl: resultSigned.signedUrl,
        cached: true,
        contentHash,
      });
    }
  }

  // Lookup-only (client will process in-browser)
  if (!(resultFile instanceof File)) {
    return NextResponse.json({
      cached: false,
      contentHash,
      needsProcessing: true,
    });
  }

  const resultBuffer = Buffer.from(await resultFile.arrayBuffer());
  if (resultBuffer.length === 0) {
    return NextResponse.json({ error: "Empty result" }, { status: 400 });
  }
  if (resultBuffer.length > MAX_BG_UPLOAD_BYTES * 2) {
    return NextResponse.json({ error: "Result too large" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const ext = extensionFor(mime, file.name);
  const originalPath = `${user.id}/${id}/original.${ext}`;
  const resultPath = `${user.id}/${id}/result.png`;

  const { error: originalUploadError } = await supabase.storage
    .from(BG_STORAGE_BUCKET)
    .upload(originalPath, buffer, { contentType: mime, upsert: false });

  if (originalUploadError) {
    return NextResponse.json(
      { error: originalUploadError.message },
      { status: 502 },
    );
  }

  const { error: resultUploadError } = await supabase.storage
    .from(BG_STORAGE_BUCKET)
    .upload(resultPath, resultBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (resultUploadError) {
    await supabase.storage.from(BG_STORAGE_BUCKET).remove([originalPath]);
    return NextResponse.json(
      { error: resultUploadError.message },
      { status: 502 },
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("bg_removals")
    .insert({
      id,
      user_id: user.id,
      mode,
      original_path: originalPath,
      result_path: resultPath,
      original_name: file.name || null,
      content_hash: contentHash,
      duration_ms: durationMs,
      cache_hit: false,
      failed: false,
    })
    .select("id, mode, created_at, original_name")
    .single();

  if (insertError || !row) {
    await supabase.storage
      .from(BG_STORAGE_BUCKET)
      .remove([originalPath, resultPath]);
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to save record" },
      { status: 502 },
    );
  }

  const [{ data: originalSigned }, { data: resultSigned }] = await Promise.all([
    supabase.storage
      .from(BG_STORAGE_BUCKET)
      .createSignedUrl(originalPath, 60 * 60),
    supabase.storage.from(BG_STORAGE_BUCKET).createSignedUrl(resultPath, 60 * 60),
  ]);

  return NextResponse.json({
    id: row.id,
    mode: row.mode,
    createdAt: row.created_at,
    originalName: row.original_name,
    originalUrl: originalSigned?.signedUrl ?? null,
    resultUrl: resultSigned?.signedUrl ?? null,
    cached: false,
    contentHash,
  });
}

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import {
  ALLOWED_BG_MIME,
  BG_STORAGE_BUCKET,
  MAX_BG_UPLOAD_BYTES,
  type CutoutMode,
} from "@/backend/cutout/constants";

export const maxDuration = 120;

const HEALTH_WAIT_MS = 90_000;
const HEALTH_POLL_MS = 3_000;
const PROCESS_TIMEOUT_MS = 110_000;

function cutoutServiceUrl(): string | null {
  const raw =
    process.env.CUTOUT_SERVICE_URL?.trim() ||
    process.env.REMBG_SERVICE_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

function cutoutServiceKey(): string | undefined {
  return (
    process.env.CUTOUT_SERVICE_KEY?.trim() ||
    process.env.REMBG_SERVICE_KEY?.trim() ||
    undefined
  );
}

function extensionFor(mime: string, filename: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  const fromName = filename.split(".").pop();
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : "bin";
}

function parseMode(value: FormDataEntryValue | null): CutoutMode {
  return value === "fast" ? "fast" : "quality";
}

function authHeaders(): HeadersInit {
  const key = cutoutServiceKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

type HealthState = { ok: boolean; ready: boolean; coldStart: boolean };

async function waitForHealthy(serviceUrl: string): Promise<HealthState> {
  const deadline = Date.now() + HEALTH_WAIT_MS;
  let sawFailure = false;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${serviceUrl}/health`, {
        method: "GET",
        headers: authHeaders(),
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          ready?: boolean;
        };
        if (body.ready !== false) {
          return { ok: true, ready: true, coldStart: sawFailure };
        }
        // Space is up but model still loading
        sawFailure = true;
      } else {
        sawFailure = true;
      }
    } catch {
      sawFailure = true;
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }

  return { ok: false, ready: false, coldStart: true };
}

type ServiceResult =
  | { ok: true; bytes: Buffer; durationMs: number }
  | {
      ok: false;
      status: number;
      error: string;
      kind: "validation" | "timeout" | "processing" | "unreachable";
    };

async function callRemoveOnce(
  serviceUrl: string,
  buffer: Buffer,
  mime: string,
  filename: string,
  mode: CutoutMode,
): Promise<ServiceResult> {
  const outbound = new FormData();
  outbound.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mime }),
    filename,
  );
  outbound.append("mode", mode);

  const started = Date.now();
  try {
    const res = await fetch(`${serviceUrl}/remove`, {
      method: "POST",
      headers: authHeaders(),
      body: outbound,
      signal: AbortSignal.timeout(PROCESS_TIMEOUT_MS),
    });

    if (res.status === 400 || res.status === 413) {
      const body = await res.json().catch(() => ({}));
      const detail =
        typeof body === "object" && body && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : "Invalid image";
      return { ok: false, status: res.status, error: detail, kind: "validation" };
    }

    if (res.status === 504) {
      const body = await res.json().catch(() => ({}));
      const detail =
        typeof body === "object" && body && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : "Processing took too long — try a smaller image or Fast mode.";
      return { ok: false, status: 504, error: detail, kind: "timeout" };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: "Something went wrong removing the background — try again.",
        kind: "processing",
      };
    }

    const bytes = Buffer.from(await res.arrayBuffer());
    return { ok: true, bytes, durationMs: Date.now() - started };
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    if (timedOut) {
      return {
        ok: false,
        status: 504,
        error:
          "Processing took too long — try a smaller image or Fast mode.",
        kind: "timeout",
      };
    }
    return {
      ok: false,
      status: 504,
      error:
        "Couldn’t reach the cutout service. It may be waking up — try again in a moment.",
      kind: "unreachable",
    };
  }
}

/** One retry with backoff for transient failures only (not validation). */
async function callRemoveWithRetry(
  serviceUrl: string,
  buffer: Buffer,
  mime: string,
  filename: string,
  mode: CutoutMode,
): Promise<ServiceResult> {
  const first = await callRemoveOnce(serviceUrl, buffer, mime, filename, mode);
  if (first.ok || first.kind === "validation" || first.kind === "timeout") {
    return first;
  }
  await new Promise((r) => setTimeout(r, 1_500));
  return callRemoveOnce(serviceUrl, buffer, mime, filename, mode);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceUrl = cutoutServiceUrl();
  if (!serviceUrl) {
    return NextResponse.json(
      {
        error:
          "Cutout isn’t configured. Set CUTOUT_SERVICE_URL in .env.local (see services/cutout/README.md).",
      },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const mode = parseMode(form.get("mode"));

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
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  // Cache hit: same user + hash + mode
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
      console.info(
        JSON.stringify({
          event: "cutout_cache_hit",
          userId: user.id,
          mode,
          sizeBytes: buffer.length,
          id: cached.id,
        }),
      );
      return NextResponse.json({
        id: cached.id,
        mode: cached.mode,
        createdAt: cached.created_at,
        originalName: cached.original_name,
        originalUrl: originalSigned.signedUrl,
        resultUrl: resultSigned.signedUrl,
        cached: true,
      });
    }
  }

  const health = await waitForHealthy(serviceUrl);
  if (!health.ok) {
    console.warn(
      JSON.stringify({
        event: "cutout_cold_start_timeout",
        userId: user.id,
        mode,
        sizeBytes: buffer.length,
      }),
    );
    return NextResponse.json(
      {
        error:
          "The cutout service is still waking up — give it a moment and try again.",
        coldStart: true,
      },
      { status: 503 },
    );
  }

  const id = crypto.randomUUID();
  const ext = extensionFor(mime, file.name);
  const originalPath = `${user.id}/${id}/original.${ext}`;
  const resultPath = `${user.id}/${id}/result.png`;

  const { error: originalUploadError } = await supabase.storage
    .from(BG_STORAGE_BUCKET)
    .upload(originalPath, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (originalUploadError) {
    return NextResponse.json(
      { error: originalUploadError.message },
      { status: 502 },
    );
  }

  const filename = file.name || `upload.${ext}`;
  const result = await callRemoveWithRetry(
    serviceUrl,
    buffer,
    mime,
    filename,
    mode,
  );

  if (!result.ok) {
    await supabase.storage.from(BG_STORAGE_BUCKET).remove([originalPath]);
    console.warn(
      JSON.stringify({
        event: "cutout_failed",
        userId: user.id,
        mode,
        sizeBytes: buffer.length,
        kind: result.kind,
        status: result.status,
      }),
    );
    const status =
      result.kind === "validation"
        ? 400
        : result.kind === "timeout"
          ? 504
          : 502;
    return NextResponse.json(
      {
        error: result.error,
        coldStart: result.kind === "unreachable" || health.coldStart,
      },
      { status },
    );
  }

  console.info(
    JSON.stringify({
      event: "cutout_ok",
      userId: user.id,
      mode,
      sizeBytes: buffer.length,
      durationMs: result.durationMs,
      coldStart: health.coldStart,
    }),
  );

  const { error: resultUploadError } = await supabase.storage
    .from(BG_STORAGE_BUCKET)
    .upload(resultPath, result.bytes, {
      contentType: "image/png",
      upsert: false,
    });

  if (resultUploadError) {
    await supabase.storage
      .from(BG_STORAGE_BUCKET)
      .remove([originalPath, resultPath]);
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
    coldStart: health.coldStart,
  });
}

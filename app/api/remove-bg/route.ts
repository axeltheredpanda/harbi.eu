import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import {
  ALLOWED_BG_MIME,
  BG_STORAGE_BUCKET,
  MAX_BG_UPLOAD_BYTES,
  type CutoutMode,
} from "@/backend/cutout/constants";

export const maxDuration = 120;

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceUrl = process.env.REMBG_SERVICE_URL?.replace(/\/$/, "");
  if (!serviceUrl) {
    return NextResponse.json(
      {
        error:
          "Background removal isn’t configured yet. Set REMBG_SERVICE_URL on the server.",
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
      { error: `File too large (max ${Math.floor(MAX_BG_UPLOAD_BYTES / (1024 * 1024))} MB)` },
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

  const id = crypto.randomUUID();
  const ext = extensionFor(mime, file.name);
  const originalPath = `${user.id}/${id}/original.${ext}`;
  const resultPath = `${user.id}/${id}/result.png`;
  const buffer = Buffer.from(await file.arrayBuffer());

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

  const outbound = new FormData();
  outbound.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mime }),
    file.name || `upload.${ext}`,
  );
  outbound.append("mode", mode);

  const headers: HeadersInit = {};
  const serviceKey = process.env.REMBG_SERVICE_KEY;
  if (serviceKey) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }

  let rembgResponse: Response;
  try {
    rembgResponse = await fetch(`${serviceUrl}/remove`, {
      method: "POST",
      headers,
      body: outbound,
      // Cold starts on free hosts can be long
      signal: AbortSignal.timeout(110_000),
    });
  } catch (err) {
    await supabase.storage.from(BG_STORAGE_BUCKET).remove([originalPath]);
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "The rembg service timed out — try again, or use Fast mode."
        : "Couldn’t reach the rembg service. It may be waking up — try again in a moment.";
    return NextResponse.json({ error: message, coldStart: true }, { status: 504 });
  }

  if (!rembgResponse.ok) {
    await supabase.storage.from(BG_STORAGE_BUCKET).remove([originalPath]);
    const detail = await rembgResponse.text().catch(() => "");
    return NextResponse.json(
      {
        error: detail || `rembg failed (${rembgResponse.status})`,
        coldStart: rembgResponse.status === 502 || rembgResponse.status === 503,
      },
      { status: 502 },
    );
  }

  const resultBytes = Buffer.from(await rembgResponse.arrayBuffer());

  const { error: resultUploadError } = await supabase.storage
    .from(BG_STORAGE_BUCKET)
    .upload(resultPath, resultBytes, {
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
  });
}

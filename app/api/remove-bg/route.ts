import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import {
  BG_STORAGE_BUCKET,
  type CutoutMode,
} from "@/backend/cutout/constants";

function parseMode(value: unknown): CutoutMode {
  return value === "fast" ? "fast" : "quality";
}

function ownedPath(userId: string, path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.length < 512 &&
    !path.includes("..") &&
    path.startsWith(`${userId}/`)
  );
}

async function signedPair(
  supabase: Awaited<ReturnType<typeof createClient>>,
  originalPath: string,
  resultPath: string,
) {
  const [{ data: originalSigned }, { data: resultSigned }] = await Promise.all([
    supabase.storage
      .from(BG_STORAGE_BUCKET)
      .createSignedUrl(originalPath, 60 * 60),
    supabase.storage
      .from(BG_STORAGE_BUCKET)
      .createSignedUrl(resultPath, 60 * 60),
  ]);
  return {
    originalUrl: originalSigned?.signedUrl ?? null,
    resultUrl: resultSigned?.signedUrl ?? null,
  };
}

/**
 * Cutout history/cache API (JSON only).
 *
 * Images are uploaded from the browser straight to Supabase Storage so we
 * never hit Vercel's ~4.5 MB request body limit with original + result.
 *
 * - `{ action: "lookup", contentHash, mode }`
 * - `{ action: "save", contentHash, mode, originalPath, resultPath, ... }`
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    contentHash?: string;
    mode?: string;
    originalName?: string | null;
    originalPath?: string;
    resultPath?: string;
    durationMs?: number | null;
  } | null;

  if (!body || (body.action !== "lookup" && body.action !== "save")) {
    return NextResponse.json(
      { error: "action must be lookup or save" },
      { status: 400 },
    );
  }

  const mode = parseMode(body.mode);
  const contentHash = String(body.contentHash ?? "")
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(contentHash)) {
    return NextResponse.json(
      { error: "contentHash must be sha256 hex" },
      { status: 400 },
    );
  }

  if (body.action === "lookup") {
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
      const urls = await signedPair(
        supabase,
        cached.original_path,
        cached.result_path,
      );
      if (urls.originalUrl && urls.resultUrl) {
        const { recordServiceEvent } = await import(
          "@/backend/analytics/record"
        );
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
          originalUrl: urls.originalUrl,
          resultUrl: urls.resultUrl,
          cached: true,
          contentHash,
        });
      }
    }

    return NextResponse.json({
      cached: false,
      contentHash,
      needsProcessing: true,
    });
  }

  // action === "save"
  if (!ownedPath(user.id, body.originalPath)) {
    return NextResponse.json({ error: "Invalid originalPath" }, { status: 400 });
  }
  if (!ownedPath(user.id, body.resultPath)) {
    return NextResponse.json({ error: "Invalid resultPath" }, { status: 400 });
  }

  const durationRaw = Number(body.durationMs);
  const durationMs =
    Number.isFinite(durationRaw) && durationRaw >= 0
      ? Math.round(durationRaw)
      : null;

  // Prefer the UUID folder already used in the storage path.
  const pathId = body.originalPath.split("/")[1];
  const id =
    pathId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      pathId,
    )
      ? pathId
      : crypto.randomUUID();

  const baseRow = {
    id,
    user_id: user.id,
    mode,
    original_path: body.originalPath,
    result_path: body.resultPath,
    original_name: body.originalName ?? null,
    content_hash: contentHash,
  };

  let { data: row, error: insertError } = await supabase
    .from("bg_removals")
    .insert({
      ...baseRow,
      duration_ms: durationMs,
      cache_hit: false,
      failed: false,
    })
    .select("id, mode, created_at, original_name")
    .single();

  // Older DBs may lack analytics columns - retry with the core schema only.
  if (
    insertError &&
    /duration_ms|cache_hit|failed|schema cache/i.test(insertError.message)
  ) {
    ({ data: row, error: insertError } = await supabase
      .from("bg_removals")
      .insert(baseRow)
      .select("id, mode, created_at, original_name")
      .single());
  }

  if (insertError || !row) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to save record" },
      { status: 502 },
    );
  }

  const urls = await signedPair(supabase, body.originalPath, body.resultPath);
  if (!urls.originalUrl || !urls.resultUrl) {
    return NextResponse.json(
      {
        error:
          "Saved, but signed URLs failed - check the bg-removals storage bucket",
        id: row.id,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    id: row.id,
    mode: row.mode,
    createdAt: row.created_at,
    originalName: row.original_name,
    originalUrl: urls.originalUrl,
    resultUrl: urls.resultUrl,
    cached: false,
    contentHash,
  });
}

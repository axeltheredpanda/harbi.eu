import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import { BG_STORAGE_BUCKET } from "@/backend/cutout/constants";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("bg_removals")
    .select("id, mode, created_at, original_name, original_path, result_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const items = await Promise.all(
    (rows ?? []).map(async (row) => {
      const [{ data: originalSigned }, { data: resultSigned }] =
        await Promise.all([
          supabase.storage
            .from(BG_STORAGE_BUCKET)
            .createSignedUrl(row.original_path, 60 * 60),
          supabase.storage
            .from(BG_STORAGE_BUCKET)
            .createSignedUrl(row.result_path, 60 * 60),
        ]);
      return {
        id: row.id,
        mode: row.mode,
        createdAt: row.created_at,
        originalName: row.original_name,
        originalUrl: originalSigned?.signedUrl ?? null,
        resultUrl: resultSigned?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ items });
}

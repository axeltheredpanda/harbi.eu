import { createClient } from "@/backend/supabase/server";
import { BG_STORAGE_BUCKET } from "@/backend/cutout/constants";
import type { CutoutMode } from "@/backend/cutout/constants";

export type CutoutHistoryItem = {
  id: string;
  mode: CutoutMode;
  createdAt: string;
  originalName: string | null;
  originalUrl: string | null;
  resultUrl: string | null;
};

export async function listCutoutHistory(
  limit = 24,
): Promise<CutoutHistoryItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from("bg_removals")
    .select("id, mode, created_at, original_name, original_path, result_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows) return [];

  return Promise.all(
    rows.map(async (row) => {
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
}

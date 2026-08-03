import { createJarvisClient } from "@/backend/jarvis/db";
import { JARVIS_SEARCH_TOP_K } from "@/backend/jarvis/constants";
import { embedQuery } from "@/backend/jarvis/voyage";

export type SearchHit = {
  id: string;
  title: string;
  content: string;
  auto_summary: string | null;
  auto_tags: string[];
  updated_at: string;
  score: number;
};

export async function searchNotes(
  query: string,
  limit = JARVIS_SEARCH_TOP_K,
): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = await createJarvisClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let embedding: number[] | null = null;
  try {
    embedding = await embedQuery(q);
  } catch (err) {
    console.warn("query embed failed, FTS-only fallback", err);
  }

  if (embedding) {
    const { data, error } = await supabase.rpc("match_notes", {
      query_embedding: `[${embedding.join(",")}]`,
      query_text: q,
      match_user_id: user.id,
      match_count: limit,
    });
    if (!error && data) {
      return (data as SearchHit[]).map((row) => ({
        ...row,
        auto_tags: row.auto_tags ?? [],
      }));
    }
    if (error) console.warn("match_notes", error.message);
  }

  // FTS-only fallback (no Voyage / no RPC)
  const { data: rows, error: ftsError } = await supabase
    .from("notes")
    .select("id, title, content, auto_summary, auto_tags, updated_at")
    .eq("user_id", user.id)
    .or(`title.ilike.%${q}%,content.ilike.%${q}%,auto_summary.ilike.%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (ftsError) throw new Error(ftsError.message);
  return (rows ?? []).map((row, i) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    auto_summary: row.auto_summary,
    auto_tags: row.auto_tags ?? [],
    updated_at: row.updated_at,
    score: 1 - i * 0.05,
  }));
}

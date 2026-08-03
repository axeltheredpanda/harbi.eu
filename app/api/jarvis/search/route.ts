import { NextResponse } from "next/server";
import { searchNotes } from "@/backend/jarvis/search";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { query?: string };
  const query = body.query?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
    const hits = await searchNotes(query);
    return NextResponse.json({
      hits: hits.map((h) => ({
        id: h.id,
        title: h.title,
        auto_summary: h.auto_summary,
        auto_tags: h.auto_tags,
        updated_at: h.updated_at,
        score: h.score,
        excerpt: (h.auto_summary || h.content).slice(0, 220),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    const status = message === "Unauthorized" ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

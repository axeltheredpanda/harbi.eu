import { NextResponse } from "next/server";
import {
  bootstrapNewsIfEmpty,
  listFeedItemsPublic,
  listFeedsPublic,
} from "@/backend/news/sync";

export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feedParam = searchParams.get("feeds");
  const feedIds = feedParam
    ? feedParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const limit = Number(searchParams.get("limit") ?? "120");
  const safeLimit = Number.isFinite(limit) ? Math.min(limit, 200) : 120;

  try {
    // After news.sql, tables exist but are empty until a sync runs.
    // Bootstrap once with the service role so opening the drawer fills the shelf
    // without requiring a logged-in Refresh click.
    await bootstrapNewsIfEmpty();

    const [feeds, items] = await Promise.all([
      listFeedsPublic(),
      listFeedItemsPublic({
        feedIds,
        limit: safeLimit,
      }),
    ]);

    const lastSyncedAt = feeds.reduce<string | null>((latest, f) => {
      if (!f.last_fetched_at) return latest;
      if (!latest) return f.last_fetched_at;
      return f.last_fetched_at > latest ? f.last_fetched_at : latest;
    }, null);

    return NextResponse.json({ feeds, items, lastSyncedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load news" },
      { status: 502 },
    );
  }
}

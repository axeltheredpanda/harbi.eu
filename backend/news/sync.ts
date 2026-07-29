import Parser from "rss-parser";
import { NEWS_FEEDS, type NewsFeed } from "@/content/news-feeds";
import { createServiceClient } from "@/backend/supabase/service";

export type NewsItemRow = {
  id: string;
  feed_id: string;
  guid: string;
  title: string;
  url: string;
  source_name: string;
  summary: string | null;
  published_at: string | null;
  tags: string[];
  created_at: string;
};

type ParsedItem = {
  feedId: string;
  sourceName: string;
  guid: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: string | null;
  tags: string[];
};

const parser = new Parser({
  timeout: 15_000,
  headers: {
    "User-Agent": "harbi.eu-news-bot/1.0 (+https://harbi.eu)",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
  },
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickGuid(item: Parser.Item, link: string): string {
  const extra = item as Parser.Item & { id?: string };
  const raw = item.guid || extra.id || link;
  return String(raw).slice(0, 500);
}

function pickLink(item: Parser.Item): string | null {
  const extra = item as Parser.Item & { id?: string };
  const link = item.link?.trim() || extra.id?.trim();
  if (!link) return null;
  try {
    const url = new URL(link);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchFeed(feed: NewsFeed): Promise<ParsedItem[]> {
  const parsed = await parser.parseURL(feed.url);
  const limit = feed.limit ?? 12;
  const items: ParsedItem[] = [];

  for (const item of parsed.items.slice(0, limit)) {
    const url = pickLink(item);
    if (!url) continue;
    const title = (item.title ?? "").trim();
    if (!title) continue;

    const summaryRaw =
      item.contentSnippet ||
      item.summary ||
      item.content ||
      item.description ||
      "";
    const summary = summaryRaw ? stripHtml(summaryRaw).slice(0, 400) : null;

    let publishedAt: string | null = null;
    if (item.isoDate) {
      publishedAt = new Date(item.isoDate).toISOString();
    } else if (item.pubDate) {
      const d = new Date(item.pubDate);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }

    items.push({
      feedId: feed.id,
      sourceName: feed.name,
      guid: pickGuid(item, url),
      title: title.slice(0, 300),
      url,
      summary,
      publishedAt,
      tags: feed.tags,
    });
  }

  return items;
}

export type SyncResult = {
  feeds: number;
  upserted: number;
  errors: { feedId: string; message: string }[];
};

/** Pull all curated feeds and upsert into news_items. */
export async function syncNewsFeeds(
  feedIds?: string[],
): Promise<SyncResult> {
  const supabase = createServiceClient();
  const feeds = feedIds?.length
    ? NEWS_FEEDS.filter((f) => feedIds.includes(f.id))
    : NEWS_FEEDS;

  const errors: SyncResult["errors"] = [];
  let upserted = 0;

  for (const feed of feeds) {
    try {
      const items = await fetchFeed(feed);
      if (items.length === 0) continue;

      const rows = items.map((item) => ({
        feed_id: item.feedId,
        guid: item.guid,
        title: item.title,
        url: item.url,
        source_name: item.sourceName,
        summary: item.summary,
        published_at: item.publishedAt,
        tags: item.tags,
      }));

      const { error, count } = await supabase
        .from("news_items")
        .upsert(rows, {
          onConflict: "feed_id,guid",
          ignoreDuplicates: false,
          count: "exact",
        });

      if (error) {
        errors.push({ feedId: feed.id, message: error.message });
      } else {
        upserted += count ?? rows.length;
      }
    } catch (err) {
      errors.push({
        feedId: feed.id,
        message: err instanceof Error ? err.message : "Feed fetch failed",
      });
    }
  }

  return { feeds: feeds.length, upserted, errors };
}

export async function listNewsItems(options?: {
  tag?: string;
  limit?: number;
}): Promise<NewsItemRow[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("news_items")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(options?.limit ?? 40);

  if (options?.tag) {
    query = query.contains("tags", [options.tag]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NewsItemRow[];
}

/** Public read via anon key (RLS allows select). */
export async function listNewsItemsPublic(options?: {
  tag?: string;
  limit?: number;
}): Promise<NewsItemRow[]> {
  const { createClient } = await import("@/backend/supabase/server");
  const supabase = await createClient();
  let query = supabase
    .from("news_items")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(options?.limit ?? 40);

  if (options?.tag) {
    query = query.contains("tags", [options.tag]);
  }

  const { data, error } = await query;
  if (error) {
    // Table missing / not migrated yet
    console.warn("listNewsItemsPublic", error.message);
    return [];
  }
  return (data ?? []) as NewsItemRow[];
}

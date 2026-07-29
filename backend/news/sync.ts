import { NEWS_FEEDS, type NewsFeed } from "@/content/news-feeds";
import { createServiceClient } from "@/backend/supabase/service";

export const FEED_FAILURE_THRESHOLD = 5;
const FETCH_TIMEOUT_MS = 12_000;
const SYNC_CONCURRENCY = 3;

export type FeedRow = {
  id: string;
  url: string;
  name: string;
  favicon_url: string | null;
  last_fetched_at: string | null;
  status: "ok" | "unreachable";
  consecutive_failures: number;
  tags: string[];
  created_at: string;
};

export type FeedItemRow = {
  id: string;
  feed_id: string;
  guid: string;
  title: string;
  url: string;
  published_at: string | null;
  content_snippet: string | null;
  full_content: string | null;
  read_at: string | null;
  created_at: string;
};

export type FeedItemWithFeed = FeedItemRow & {
  feed: Pick<
    FeedRow,
    "id" | "name" | "favicon_url" | "status" | "consecutive_failures"
  >;
};

type CustomItem = {
  title?: string;
  link?: string;
  guid?: string;
  id?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  summary?: string;
  content?: string;
  description?: string;
  contentEncoded?: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function faviconForUrl(feedUrl: string): string {
  try {
    const host = new URL(feedUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
  } catch {
    return "";
  }
}

function pickGuid(item: CustomItem, link: string): string {
  const raw = item.guid || item.id || link;
  return String(raw).slice(0, 500);
}

function pickLink(item: CustomItem): string | null {
  const link = item.link?.trim() || item.id?.trim();
  if (!link) return null;
  try {
    const url = new URL(link);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function parseFeedXml(xml: string): Promise<CustomItem[]> {
  const Parser = (await import("rss-parser")).default;
  const parser = new Parser({
    timeout: FETCH_TIMEOUT_MS,
    customFields: {
      item: [["content:encoded", "contentEncoded"]],
    },
  });
  const parsed = await parser.parseString(xml);
  return (parsed.items ?? []) as CustomItem[];
}

async function fetchFeedItems(
  feed: NewsFeed,
): Promise<{
  items: {
    guid: string;
    title: string;
    url: string;
    publishedAt: string | null;
    snippet: string | null;
    fullContent: string | null;
  }[];
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "harbi.eu-news-bot/1.0 (+https://harbi.eu)",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const xml = await res.text();
    const rawItems = await parseFeedXml(xml);
    const limit = feed.limit ?? 20;
    const items = [];

    for (const item of rawItems.slice(0, limit)) {
      const url = pickLink(item);
      if (!url) continue;
      const title = (item.title ?? "").trim();
      if (!title) continue;

      const fullRaw =
        item.contentEncoded || item.content || item.description || "";
      const snippetRaw =
        item.contentSnippet || item.summary || fullRaw || "";
      const snippet = snippetRaw
        ? stripHtml(snippetRaw).slice(0, 400)
        : null;
      const fullContent = fullRaw ? fullRaw.slice(0, 50_000) : null;

      let publishedAt: string | null = null;
      if (item.isoDate) {
        publishedAt = new Date(item.isoDate).toISOString();
      } else if (item.pubDate) {
        const d = new Date(item.pubDate);
        if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
      }

      items.push({
        guid: pickGuid(item, url),
        title: title.slice(0, 300),
        url,
        publishedAt,
        snippet,
        fullContent,
      });
    }

    return { items };
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export type SyncResult = {
  feeds: number;
  inserted: number;
  errors: { feedId: string; message: string }[];
  unreachable: string[];
};

/** Ensure curated feeds exist, fetch concurrently, insert new items only. */
export async function syncNewsFeeds(feedIds?: string[]): Promise<SyncResult> {
  const supabase = createServiceClient();
  const feeds = feedIds?.length
    ? NEWS_FEEDS.filter((f) => feedIds.includes(f.id))
    : NEWS_FEEDS;

  // Upsert feed metadata from curated config
  const feedRows = feeds.map((f) => ({
    id: f.id,
    url: f.url,
    name: f.name,
    favicon_url: faviconForUrl(f.url) || null,
    tags: f.tags,
  }));

  if (feedRows.length) {
    const { error: feedErr } = await supabase.from("feeds").upsert(feedRows, {
      onConflict: "id",
    });
    if (feedErr) throw feedErr;
  }

  const errors: SyncResult["errors"] = [];
  const unreachable: string[] = [];
  let inserted = 0;

  type FeedOutcome = {
    feedId: string;
    inserted: number;
    error?: string;
    unreachable?: boolean;
  };

  const outcomes = await mapPool(
    feeds,
    SYNC_CONCURRENCY,
    async (feed): Promise<FeedOutcome> => {
      try {
        const { items } = await fetchFeedItems(feed);
        const rows = items.map((item) => ({
          feed_id: feed.id,
          guid: item.guid,
          title: item.title,
          url: item.url,
          published_at: item.publishedAt,
          content_snippet: item.snippet,
          full_content: item.fullContent,
        }));

        let count = 0;
        if (rows.length) {
          const { error, count: c } = await supabase
            .from("feed_items")
            .upsert(rows, {
              onConflict: "feed_id,guid",
              ignoreDuplicates: true,
              count: "exact",
            });
          if (error) throw new Error(error.message);
          count = c ?? 0;
        }

        await supabase
          .from("feeds")
          .update({
            last_fetched_at: new Date().toISOString(),
            status: "ok",
            consecutive_failures: 0,
            favicon_url: faviconForUrl(feed.url) || null,
          })
          .eq("id", feed.id);

        return { feedId: feed.id, inserted: count };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Feed fetch failed";

        const { data: current } = await supabase
          .from("feeds")
          .select("consecutive_failures")
          .eq("id", feed.id)
          .maybeSingle();

        const failures = (current?.consecutive_failures ?? 0) + 1;
        const status =
          failures >= FEED_FAILURE_THRESHOLD ? "unreachable" : "ok";

        await supabase
          .from("feeds")
          .update({
            consecutive_failures: failures,
            status,
            last_fetched_at: new Date().toISOString(),
          })
          .eq("id", feed.id);

        return {
          feedId: feed.id,
          inserted: 0,
          error: message,
          unreachable: status === "unreachable",
        };
      }
    },
  );

  for (const o of outcomes) {
    inserted += o.inserted;
    if (o.error) errors.push({ feedId: o.feedId, message: o.error });
    if (o.unreachable) unreachable.push(o.feedId);
  }

  return { feeds: feeds.length, inserted, errors, unreachable };
}

export async function listFeedsPublic(): Promise<FeedRow[]> {
  const { createClient } = await import("@/backend/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feeds")
    .select("*")
    .order("name");
  if (error) {
    console.warn("listFeedsPublic", error.message);
    throw new Error(
      error.message.includes("schema cache") || error.code === "42P01"
        ? "Table feeds missing — run supabase/news.sql in the Supabase SQL editor."
        : error.message,
    );
  }
  return (data ?? []) as FeedRow[];
}

/** Upsert curated feed rows (no RSS fetch). Uses service role when available. */
export async function ensureFeedsSeeded(): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const supabase = createServiceClient();
    const feedRows = NEWS_FEEDS.map((f) => ({
      id: f.id,
      url: f.url,
      name: f.name,
      favicon_url: faviconForUrl(f.url) || null,
      tags: f.tags,
    }));
    const { error } = await supabase.from("feeds").upsert(feedRows, {
      onConflict: "id",
    });
    if (error) console.warn("ensureFeedsSeeded", error.message);
  } catch (err) {
    console.warn("ensureFeedsSeeded", err);
  }
}

/**
 * First open: if shelves have no articles yet, pull RSS once (service role).
 * Avoids requiring login just to populate after running news.sql.
 */
export async function bootstrapNewsIfEmpty(): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    await ensureFeedsSeeded();
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("feed_items")
      .select("id", { count: "exact", head: true });
    if (error) {
      console.warn("bootstrapNewsIfEmpty count", error.message);
      return false;
    }
    if ((count ?? 0) > 0) return false;
    await syncNewsFeeds();
    return true;
  } catch (err) {
    console.warn("bootstrapNewsIfEmpty", err);
    return false;
  }
}

export async function listFeedItemsPublic(options?: {
  feedIds?: string[];
  limit?: number;
}): Promise<FeedItemWithFeed[]> {
  const { createClient } = await import("@/backend/supabase/server");
  const supabase = await createClient();
  let query = supabase
    .from("feed_items")
    .select(
      "*, feed:feeds!inner(id, name, favicon_url, status, consecutive_failures)",
    )
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(options?.limit ?? 120);

  if (options?.feedIds?.length) {
    query = query.in("feed_id", options.feedIds);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("listFeedItemsPublic", error.message);
    // Missing relation / empty join — surface clearly upstream when feeds also fail
    if (
      error.message.includes("schema cache") ||
      error.code === "42P01" ||
      error.message.includes("feed_items")
    ) {
      throw new Error(
        "Table feed_items missing — run supabase/news.sql in the Supabase SQL editor.",
      );
    }
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as FeedItemRow & {
      feed:
        | FeedItemWithFeed["feed"]
        | FeedItemWithFeed["feed"][];
    };
    const feed = Array.isArray(r.feed) ? r.feed[0]! : r.feed;
    const { feed: _f, ...item } = r;
    return { ...item, feed } as FeedItemWithFeed;
  });
}

export async function markItemsRead(options: {
  itemIds?: string[];
  all?: boolean;
  read: boolean;
}): Promise<number> {
  const { createClient } = await import("@/backend/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const readAt = options.read ? new Date().toISOString() : null;

  if (options.all) {
    const { error, count } = await supabase
      .from("feed_items")
      .update({ read_at: readAt }, { count: "exact" })
      .neq("guid", "");
    if (error) throw error;
    return count ?? 0;
  }

  if (!options.itemIds?.length) return 0;
  const { error, count } = await supabase
    .from("feed_items")
    .update({ read_at: readAt }, { count: "exact" })
    .in("id", options.itemIds);
  if (error) throw error;
  return count ?? 0;
}

/** @deprecated alias during migration */
export async function listNewsItemsPublic() {
  return listFeedItemsPublic();
}

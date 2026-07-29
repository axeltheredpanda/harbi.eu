import { createClient } from "@/backend/supabase/server";
import {
  estimateCacheSavingsUsd,
  estimateCostUsd,
} from "@/backend/analytics/pricing";

export type ReportPeriod = "7d" | "30d" | "all";

export type DayPoint = { day: string; value: number };
export type HourPoint = { hour: number; value: number };

export type AnalyticsReport = {
  period: ReportPeriod;
  since: string | null;
  generatedAt: string;
  glance: string;
  claude: {
    turns: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    cacheHitRate: number | null;
    cacheSavingsUsd: number;
    costUsd: number;
    monthCostUsd: number;
    monthProjectionUsd: number | null;
    avgTtftMs: number | null;
    avgTotalMs: number | null;
    byModel: { model: string; turns: number; tokens: number; costUsd: number }[];
    byDay: DayPoint[];
    byConversation: {
      id: string;
      title: string;
      tokens: number;
      costUsd: number;
      turns: number;
    }[];
  };
  cutout: {
    processed: number;
    cacheHits: number;
    failures: number;
    failureRate: number | null;
    avgDurationMs: number | null;
    fast: number;
    quality: number;
    byDay: DayPoint[];
    note: string;
  };
  news: {
    itemsInPeriod: number;
    itemsByDay: DayPoint[];
    feedsOk: number;
    feedsUnreachable: number;
    unreachableNames: string[];
  };
  patterns: {
    byHour: HourPoint[];
    byWeekday: { day: string; value: number }[];
    topics: { topic: string; count: number }[];
  };
  health: {
    claudeErrors: number;
    cutoutErrors: number;
    newsErrors: number;
    errorByDay: DayPoint[];
    note: string;
  };
  traffic: {
    available: boolean;
    note: string;
    pageviews?: number;
    visitors?: number;
    byDay?: DayPoint[];
    topPages?: { path: string; views: number }[];
    referrers?: { referrer: string; views: number }[];
    countries?: { country: string; visitors: number }[];
  };
  extras: {
    conversationsStarted: number;
    messagesSent: number;
    newsReads: number;
    longestStreakDays: number;
  };
};

function startOfPeriod(period: ReportPeriod, now = new Date()): Date | null {
  if (period === "all") return null;
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (period === "7d" ? 6 : 29));
  return d;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function emptyDays(since: Date | null, until: Date): DayPoint[] {
  const points: DayPoint[] = [];
  const start = since
    ? new Date(since)
    : new Date(until.getTime() - 29 * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);
  const cursor = new Date(start);
  const end = new Date(until);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor <= end) {
    points.push({ day: cursor.toISOString().slice(0, 10), value: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

function fillSeries(
  base: DayPoint[],
  rows: { created_at: string }[],
  pick?: (row: { created_at: string }) => number,
): DayPoint[] {
  const map = new Map(base.map((p) => [p.day, p.value]));
  for (const row of rows) {
    const k = dayKey(row.created_at);
    if (!map.has(k)) continue;
    map.set(k, (map.get(k) ?? 0) + (pick ? pick(row) : 1));
  }
  return base.map((p) => ({ day: p.day, value: map.get(p.day) ?? 0 }));
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatGlance(parts: {
  tokens: number;
  conversations: number;
  cutouts: number;
  errors: number;
}): string {
  const bits: string[] = [];
  bits.push(
    parts.tokens > 0
      ? `${parts.tokens.toLocaleString("en-GB")} tokens`
      : "no Claude turns yet",
  );
  bits.push(
    parts.conversations === 1
      ? "1 conversation"
      : `${parts.conversations} conversations`,
  );
  if (parts.cutouts > 0) {
    bits.push(
      parts.cutouts === 1 ? "1 cutout" : `${parts.cutouts} cutouts`,
    );
  }
  bits.push(parts.errors === 0 ? "everything's quiet" : `${parts.errors} error${parts.errors > 1 ? "s" : ""} logged`);
  return bits.join(" · ");
}

async function fetchUmamiTraffic(
  since: Date | null,
  until: Date,
): Promise<AnalyticsReport["traffic"]> {
  const apiUrl = process.env.UMAMI_API_URL?.replace(/\/$/, "");
  const websiteId =
    process.env.UMAMI_WEBSITE_ID || process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const token = process.env.UMAMI_API_TOKEN;

  if (!apiUrl || !websiteId || !token) {
    return {
      available: false,
      note: "Umami script may be collecting pageviews, but UMAMI_API_URL + UMAMI_API_TOKEN aren’t set — traffic stays in the Umami dashboard for now. Search Console isn’t wired.",
    };
  }

  const startAt = (since ?? new Date(until.getTime() - 29 * 86_400_000)).getTime();
  const endAt = until.getTime();

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    const statsRes = await fetch(
      `${apiUrl}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`,
      { headers, next: { revalidate: 300 } },
    );
    if (!statsRes.ok) {
      return {
        available: false,
        note: `Umami API returned ${statsRes.status}. Check token permissions.`,
      };
    }
    const stats = (await statsRes.json()) as {
      pageviews?: { value?: number };
      visitors?: { value?: number };
    };

    const [pagesRes, refsRes, countriesRes] = await Promise.all([
      fetch(
        `${apiUrl}/api/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=url&limit=8`,
        { headers, next: { revalidate: 300 } },
      ),
      fetch(
        `${apiUrl}/api/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=referrer&limit=6`,
        { headers, next: { revalidate: 300 } },
      ),
      fetch(
        `${apiUrl}/api/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=country&limit=10`,
        { headers, next: { revalidate: 300 } },
      ),
    ]);

    type MetricRow = { x: string; y: number };
    const pages = pagesRes.ok ? ((await pagesRes.json()) as MetricRow[]) : [];
    const refs = refsRes.ok ? ((await refsRes.json()) as MetricRow[]) : [];
    const countries = countriesRes.ok
      ? ((await countriesRes.json()) as MetricRow[])
      : [];

    return {
      available: true,
      note: "From Umami. France-level region/department isn’t available via this API — country only. Search Console not connected.",
      pageviews: stats.pageviews?.value ?? 0,
      visitors: stats.visitors?.value ?? 0,
      topPages: pages.map((p) => ({ path: p.x, views: p.y })),
      referrers: refs.map((r) => ({
        referrer: r.x || "(direct)",
        views: r.y,
      })),
      countries: countries.map((c) => ({
        country: c.x,
        visitors: c.y,
      })),
    };
  } catch (err) {
    return {
      available: false,
      note: err instanceof Error ? err.message : "Umami fetch failed",
    };
  }
}

export async function buildAnalyticsReport(
  period: ReportPeriod,
): Promise<AnalyticsReport> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const now = new Date();
  const since = startOfPeriod(period, now);
  const sinceIso = since?.toISOString() ?? null;
  const dayBase = emptyDays(since, now);

  // --- Claude usage ---
  let claudeQuery = supabase
    .from("claude_usage")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (sinceIso) claudeQuery = claudeQuery.gte("created_at", sinceIso);
  const { data: claudeRowsRaw, error: claudeErr } = await claudeQuery;
  if (claudeErr) console.warn("claude_usage", claudeErr.message);
  const claudeRows = claudeRowsRaw ?? [];

  // Month-to-date for projection
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const { data: monthRowsRaw } = await supabase
    .from("claude_usage")
    .select(
      "model, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, created_at",
    )
    .eq("user_id", user.id)
    .gte("created_at", monthStart.toISOString());
  const monthRows = monthRowsRaw ?? [];

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheRead = 0;
  let cacheCreation = 0;
  let costUsd = 0;
  let cacheSavings = 0;
  const ttfts: number[] = [];
  const totals: number[] = [];
  const modelMap = new Map<
    string,
    { turns: number; tokens: number; costUsd: number }
  >();
  const convMap = new Map<
    string,
    { tokens: number; costUsd: number; turns: number }
  >();

  for (const row of claudeRows) {
    const inT = row.input_tokens ?? 0;
    const outT = row.output_tokens ?? 0;
    const cRead = row.cache_read_tokens ?? 0;
    const cWrite = row.cache_creation_tokens ?? 0;
    inputTokens += inT;
    outputTokens += outT;
    cacheRead += cRead;
    cacheCreation += cWrite;
    const cost = estimateCostUsd({
      model: row.model,
      inputTokens: inT,
      outputTokens: outT,
      cacheCreationTokens: cWrite,
      cacheReadTokens: cRead,
    });
    costUsd += cost;
    cacheSavings += estimateCacheSavingsUsd({
      model: row.model,
      cacheReadTokens: cRead,
    });
    if (row.ttft_ms != null) ttfts.push(row.ttft_ms);
    if (row.total_ms != null) totals.push(row.total_ms);
    const m = modelMap.get(row.model) ?? { turns: 0, tokens: 0, costUsd: 0 };
    m.turns += 1;
    m.tokens += inT + outT;
    m.costUsd += cost;
    modelMap.set(row.model, m);
    if (row.conversation_id) {
      const c =
        convMap.get(row.conversation_id) ?? {
          tokens: 0,
          costUsd: 0,
          turns: 0,
        };
      c.tokens += inT + outT;
      c.costUsd += cost;
      c.turns += 1;
      convMap.set(row.conversation_id, c);
    }
  }

  let monthCost = 0;
  for (const row of monthRows) {
    monthCost += estimateCostUsd({
      model: row.model,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cacheCreationTokens: row.cache_creation_tokens,
      cacheReadTokens: row.cache_read_tokens,
    });
  }
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const monthProjection =
    dayOfMonth > 0 ? (monthCost / dayOfMonth) * daysInMonth : null;

  const cacheHitPct =
    cacheRead + cacheCreation > 0
      ? cacheRead / (cacheRead + cacheCreation)
      : cacheRead > 0
        ? 1
        : null;

  const convIds = [...convMap.keys()];
  const titleById = new Map<string, string>();
  if (convIds.length) {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, title")
      .in("id", convIds.slice(0, 40));
    for (const c of convs ?? []) titleById.set(c.id, c.title);
  }

  // --- Cutout ---
  let cutoutQuery = supabase
    .from("bg_removals")
    .select("id, mode, created_at, duration_ms, cache_hit, failed")
    .eq("user_id", user.id);
  if (sinceIso) cutoutQuery = cutoutQuery.gte("created_at", sinceIso);
  const { data: cutoutRowsRaw, error: cutoutErr } = await cutoutQuery;
  if (cutoutErr) console.warn("bg_removals analytics", cutoutErr.message);
  const cutoutRows = cutoutRowsRaw ?? [];
  const cutoutDurations = cutoutRows
    .filter((r) => !r.cache_hit && r.duration_ms != null)
    .map((r) => r.duration_ms as number);
  const cutoutFails = cutoutRows.filter((r) => r.failed).length;
  const cutoutCacheFromRows = cutoutRows.filter((r) => r.cache_hit).length;
  const fast = cutoutRows.filter((r) => r.mode === "fast").length;
  const quality = cutoutRows.filter((r) => r.mode === "quality").length;

  // --- News ---
  let itemsQuery = supabase
    .from("feed_items")
    .select("id, created_at, read_at");
  if (sinceIso) itemsQuery = itemsQuery.gte("created_at", sinceIso);
  const { data: feedItemsRaw } = await itemsQuery;
  const feedItems = feedItemsRaw ?? [];
  const { data: feedsRaw } = await supabase
    .from("feeds")
    .select("id, name, status");
  const feeds = feedsRaw ?? [];
  const unreachable = feeds.filter((f) => f.status === "unreachable");

  // --- Patterns / topics ---
  let convPeriod = supabase
    .from("conversations")
    .select("id, created_at, topic, updated_at")
    .eq("user_id", user.id);
  if (sinceIso) convPeriod = convPeriod.gte("created_at", sinceIso);
  const { data: convPeriodRows } = await convPeriod;
  const conversations = convPeriodRows ?? [];

  const byHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    value: 0,
  }));
  for (const row of claudeRows) {
    const h = new Date(row.created_at).getUTCHours();
    byHour[h]!.value += 1;
  }

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byWeekday = weekdayNames.map((day) => ({ day, value: 0 }));
  for (const row of claudeRows) {
    const d = new Date(row.created_at).getUTCDay();
    byWeekday[d]!.value += 1;
  }

  const topicMap = new Map<string, number>();
  for (const c of conversations) {
    const t = (c.topic ?? "").trim() || "untagged";
    topicMap.set(t, (topicMap.get(t) ?? 0) + 1);
  }

  // --- Health / service events ---
  let eventsQuery = supabase
    .from("service_events")
    .select("service, kind, created_at")
    .or(`user_id.eq.${user.id},user_id.is.null`);
  if (sinceIso) eventsQuery = eventsQuery.gte("created_at", sinceIso);
  const { data: eventsRaw, error: eventsErr } = await eventsQuery;
  if (eventsErr) console.warn("service_events", eventsErr.message);
  const events = eventsRaw ?? [];
  const errorEvents = events.filter((e) => e.kind === "error" || e.kind === "timeout");
  const cutoutCacheEvents = events.filter(
    (e) =>
      e.service === "cutout" &&
      e.kind === "info",
  ).length;
  const cutoutCache = Math.max(cutoutCacheFromRows, cutoutCacheEvents);

  // Messages count
  const { data: allUserConvs } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", user.id);
  const userConvIds = new Set((allUserConvs ?? []).map((c) => c.id));
  const { data: allUserMsgs } = sinceIso
    ? await supabase
        .from("messages")
        .select("id, created_at, role, conversation_id")
        .eq("role", "user")
        .gte("created_at", sinceIso)
    : await supabase
        .from("messages")
        .select("id, created_at, role, conversation_id")
        .eq("role", "user");
  const userMessages = (allUserMsgs ?? []).filter((m) =>
    userConvIds.has(m.conversation_id),
  );

  const newsReads = feedItems.filter((i) => i.read_at).length;

  // Streak: consecutive days with any Claude usage (from all-time sample)
  const { data: streakRows } = await supabase
    .from("claude_usage")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(400);
  const daySet = new Set((streakRows ?? []).map((r) => dayKey(r.created_at)));
  let streak = 0;
  const cursor = new Date(now);
  cursor.setUTCHours(0, 0, 0, 0);
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const traffic = await fetchUmamiTraffic(since, now);

  const totalTokens = inputTokens + outputTokens;
  const glance = formatGlance({
    tokens: totalTokens,
    conversations: conversations.length,
    cutouts: cutoutRows.length,
    errors: errorEvents.length,
  });

  return {
    period,
    since: sinceIso,
    generatedAt: now.toISOString(),
    glance,
    claude: {
      turns: claudeRows.length,
      inputTokens,
      outputTokens,
      totalTokens,
      cacheReadTokens: cacheRead,
      cacheCreationTokens: cacheCreation,
      cacheHitRate: cacheHitPct,
      cacheSavingsUsd: cacheSavings,
      costUsd,
      monthCostUsd: monthCost,
      monthProjectionUsd: monthProjection,
      avgTtftMs: avg(ttfts),
      avgTotalMs: avg(totals),
      byModel: [...modelMap.entries()]
        .map(([model, v]) => ({ model, ...v }))
        .sort((a, b) => b.costUsd - a.costUsd),
      byDay: fillSeries(dayBase, claudeRows, (r) => {
        const row = r as (typeof claudeRows)[number];
        return (row.input_tokens ?? 0) + (row.output_tokens ?? 0);
      }),
      byConversation: [...convMap.entries()]
        .map(([id, v]) => ({
          id,
          title: titleById.get(id) ?? "Conversation",
          ...v,
        }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 8),
    },
    cutout: {
      processed: cutoutRows.length,
      cacheHits: cutoutCache,
      failures: cutoutFails,
      failureRate:
        cutoutRows.length > 0 ? cutoutFails / cutoutRows.length : null,
      avgDurationMs: avg(cutoutDurations),
      fast,
      quality,
      byDay: fillSeries(dayBase, cutoutRows),
      note: "Cutout runs in the browser (imgly ONNX) — no Hugging Face Space cold starts to track.",
    },
    news: {
      itemsInPeriod: feedItems.length,
      itemsByDay: fillSeries(dayBase, feedItems),
      feedsOk: feeds.filter((f) => f.status !== "unreachable").length,
      feedsUnreachable: unreachable.length,
      unreachableNames: unreachable.map((f) => f.name),
    },
    patterns: {
      byHour,
      byWeekday,
      topics: [...topicMap.entries()]
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
    },
    health: {
      claudeErrors: errorEvents.filter((e) => e.service === "claude").length,
      cutoutErrors: errorEvents.filter((e) => e.service === "cutout").length,
      newsErrors: errorEvents.filter((e) => e.service === "news").length,
      errorByDay: fillSeries(dayBase, errorEvents),
      note: "No Python microservice uptime — rembg moved in-browser. Errors come from logged service_events.",
    },
    traffic,
    extras: {
      conversationsStarted: conversations.length,
      messagesSent: userMessages.length,
      newsReads,
      longestStreakDays: streak,
    },
  };
}

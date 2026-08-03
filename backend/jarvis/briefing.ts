import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/backend/anthropic";
import { createJarvisClient, createJarvisServiceClient } from "@/backend/jarvis/db";
import { JARVIS_HAIKU } from "@/backend/jarvis/constants";

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generate today's briefing once (Haiku). Summarizes yesterday's notes.
 * Idempotent per (user_id, briefing_date).
 */
export async function generateBriefingForUser(
  userId: string,
  briefingDate = todayUtc(),
): Promise<{ content: string; created: boolean }> {
  const supabase = createJarvisServiceClient();

  const { data: existing } = await supabase
    .from("daily_briefings")
    .select("content")
    .eq("user_id", userId)
    .eq("briefing_date", briefingDate)
    .maybeSingle();

  if (existing?.content) {
    return { content: existing.content, created: false };
  }

  const day = yesterdayUtc();
  const dayStart = `${day}T00:00:00.000Z`;
  const dayEnd = `${day}T23:59:59.999Z`;

  const { data: notes } = await supabase
    .from("notes")
    .select("title, auto_summary, content, is_daily_note")
    .eq("user_id", userId)
    .gte("updated_at", dayStart)
    .lte("updated_at", dayEnd)
    .order("updated_at", { ascending: false })
    .limit(20);

  const rows = notes ?? [];
  if (!rows.length) {
    const content =
      "Quiet day in the notes — nothing new to synthesize. A blank page is still a page.";
    await supabase.from("daily_briefings").upsert(
      {
        user_id: userId,
        briefing_date: briefingDate,
        content,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,briefing_date" },
    );
    return { content, created: true };
  }

  const digest = rows
    .map((n) => {
      const body = (n.auto_summary || n.content).trim().slice(0, 400);
      return `- ${n.title}${n.is_daily_note ? " (daily)" : ""}: ${body}`;
    })
    .join("\n");

  const response = await anthropic.messages.create({
    model: JARVIS_HAIKU,
    max_tokens: 120,
    messages: [
      {
        role: "user",
        content: `Write a 1-2 sentence morning briefing for the note author based only on yesterday's notes. Editorial, warm, specific. No bullets. No preamble.

Yesterday's notes:
${digest}`,
      },
    ],
  });

  const content = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .trim()
    .slice(0, 500);

  const final =
    content ||
    "Yesterday left a few threads in the notes — worth a quiet reread.";

  await supabase.from("daily_briefings").upsert(
    {
      user_id: userId,
      briefing_date: briefingDate,
      content: final,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,briefing_date" },
  );

  return { content: final, created: true };
}

/** Cron: brief every user who has at least one note. */
export async function generateAllBriefings(): Promise<{
  users: number;
  created: number;
}> {
  const supabase = createJarvisServiceClient();
  const { data: owners } = await supabase
    .from("notes")
    .select("user_id")
    .limit(5000);

  const userIds = [...new Set((owners ?? []).map((r) => r.user_id))];
  let created = 0;
  for (const userId of userIds) {
    const result = await generateBriefingForUser(userId);
    if (result.created) created += 1;
  }
  return { users: userIds.length, created };
}

export async function getTodaysBriefing(
  userId: string,
): Promise<string | null> {
  const supabase = await createJarvisClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_briefings")
    .select("content")
    .eq("user_id", userId)
    .eq("briefing_date", today)
    .maybeSingle();
  return data?.content ?? null;
}

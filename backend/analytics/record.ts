import { createClient } from "@/backend/supabase/server";

export type ClaudeUsageInsert = {
  userId: string;
  conversationId?: string | null;
  messageId?: string | null;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheCreationTokens?: number | null;
  cacheReadTokens?: number | null;
  ttftMs?: number | null;
  totalMs?: number | null;
  webSearch?: boolean;
  aborted?: boolean;
  error?: string | null;
};

export async function recordClaudeUsage(row: ClaudeUsageInsert): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("claude_usage").insert({
      user_id: row.userId,
      conversation_id: row.conversationId ?? null,
      message_id: row.messageId ?? null,
      model: row.model,
      input_tokens: row.inputTokens ?? null,
      output_tokens: row.outputTokens ?? null,
      cache_creation_tokens: row.cacheCreationTokens ?? null,
      cache_read_tokens: row.cacheReadTokens ?? null,
      ttft_ms: row.ttftMs ?? null,
      total_ms: row.totalMs ?? null,
      web_search: Boolean(row.webSearch),
      aborted: Boolean(row.aborted),
      error: row.error ?? null,
    });
    if (error) console.warn("recordClaudeUsage", error.message);
  } catch (err) {
    console.warn("recordClaudeUsage", err);
  }
}

export async function recordServiceEvent(input: {
  userId?: string | null;
  service: "claude" | "cutout" | "news" | "umami" | "other";
  kind: "success" | "error" | "timeout" | "info";
  detail?: string;
  durationMs?: number | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("service_events").insert({
      user_id: input.userId ?? null,
      service: input.service,
      kind: input.kind,
      detail: input.detail ?? null,
      duration_ms: input.durationMs ?? null,
      meta: input.meta ?? {},
    });
    if (error) console.warn("recordServiceEvent", error.message);
  } catch (err) {
    console.warn("recordServiceEvent", err);
  }
}

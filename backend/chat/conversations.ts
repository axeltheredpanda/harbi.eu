"use server";

import { createClient } from "@/backend/supabase/server";
import {
  enrichPathWithBranches,
  findLeafFrom,
  type BranchedMessage,
} from "@/backend/chat/branches";
import type {
  Attachment,
  Conversation,
  Message,
} from "@/backend/supabase/types";

export type { BranchedMessage };

export async function listConversations(): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createConversation(
  title = "New conversation",
): Promise<Conversation> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, title })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const supabase = await createClient();
  const trimmed = title.trim().slice(0, 120);
  if (!trimmed) return;

  const { error } = await supabase
    .from("conversations")
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteConversation(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

async function loadAllMessages(
  conversationId: string,
): Promise<(Message & { attachments: Attachment[] })[]> {
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!messages?.length) return [];

  const { data: attachments, error: attachError } = await supabase
    .from("attachments")
    .select("*")
    .eq("conversation_id", conversationId);

  if (attachError) throw attachError;

  const byMessage = new Map<string, Attachment[]>();
  for (const attachment of attachments ?? []) {
    if (!attachment.message_id) continue;
    const list = byMessage.get(attachment.message_id) ?? [];
    list.push(attachment);
    byMessage.set(attachment.message_id, list);
  }

  return messages.map((message) => ({
    ...message,
    attachments: byMessage.get(message.id) ?? [],
  }));
}

/** Active branch path with sibling metadata for branch nav. */
export async function getConversationMessages(
  conversationId: string,
): Promise<BranchedMessage[]> {
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("active_leaf_id")
    .eq("id", conversationId)
    .maybeSingle();

  const all = await loadAllMessages(conversationId);
  return enrichPathWithBranches(all, conversation?.active_leaf_id ?? null);
}

/** Switch active branch to the leaf descending from `messageId`. */
export async function switchConversationBranch(
  conversationId: string,
  messageId: string,
): Promise<BranchedMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const all = await loadAllMessages(conversationId);
  if (!all.some((m) => m.id === messageId)) {
    throw new Error("Message not found");
  }

  const leafId = findLeafFrom(all, messageId);
  const { error } = await supabase
    .from("conversations")
    .update({
      active_leaf_id: leafId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) throw error;
  return enrichPathWithBranches(all, leafId);
}

export async function getConversationUsageTotals(conversationId: string): Promise<{
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("claude_usage")
    .select(
      "model, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens",
    )
    .eq("conversation_id", conversationId);

  if (error) throw error;

  const { estimateCostUsd } = await import("@/backend/analytics/pricing");
  let inputTokens = 0;
  let outputTokens = 0;
  let totalCostUsd = 0;
  for (const row of data ?? []) {
    inputTokens += row.input_tokens ?? 0;
    outputTokens += row.output_tokens ?? 0;
    totalCostUsd += estimateCostUsd({
      model: row.model,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cacheCreationTokens: row.cache_creation_tokens,
      cacheReadTokens: row.cache_read_tokens,
    });
  }
  return { inputTokens, outputTokens, totalCostUsd };
}

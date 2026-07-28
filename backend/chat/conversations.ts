"use server";

import { createClient } from "@/backend/supabase/server";
import type {
  Attachment,
  Conversation,
  MessageWithAttachments,
} from "@/backend/supabase/types";

export async function listConversations(): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createConversation(title = "New conversation"): Promise<Conversation> {
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
  // Client owns sidebar state; skip revalidatePath to keep the action snappy.
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

export async function getConversationMessages(
  conversationId: string,
): Promise<MessageWithAttachments[]> {
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

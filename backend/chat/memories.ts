"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/supabase/server";
import {
  condenseMemoryTexts,
  extractMemoryDrafts,
  type MemoryCategory,
  type TranscriptTurn,
} from "@/backend/chat/extract";
import { resolveActivePath } from "@/backend/chat/branches";

export type Memory = {
  id: string;
  user_id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  sensitive: boolean;
  pinned: boolean;
  source_conversation_id: string | null;
  last_touched_at: string;
  created_at: string;
  updated_at: string;
};

/** Soft cap for injected memory (~2–3k tokens ≈ 8–12k chars). */
const MEMORY_INJECT_CHAR_BUDGET = 10_000;

const MEMORY_EXTRACT_EVERY_N_ASSISTANT = 4;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function listMemories(): Promise<Memory[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id)
    .order("category", { ascending: true })
    .order("last_touched_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Memory[];
}

export async function updateMemory(
  id: string,
  patch: {
    title?: string;
    content?: string;
    category?: MemoryCategory;
    pinned?: boolean;
    sensitive?: boolean;
  },
): Promise<Memory> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("memories")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Update failed");
  revalidatePath("/settings");
  return data as Memory;
}

export async function deleteMemory(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function createMemoryManual(input: {
  title: string;
  content: string;
  category: MemoryCategory;
  sensitive?: boolean;
  pinned?: boolean;
}): Promise<Memory> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: user.id,
      title: input.title.trim().slice(0, 80) || "Untitled",
      content: input.content.trim().slice(0, 2000),
      category: input.category,
      sensitive: Boolean(input.sensitive),
      pinned: Boolean(input.pinned ?? input.sensitive),
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Create failed");
  revalidatePath("/settings");
  return data as Memory;
}

/**
 * Build the memory block for the system prompt.
 * Injects non-sensitive memories + explicitly pinned sensitive ones.
 * Condenses when over budget.
 */
export async function buildMemoryInjection(
  userId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select("id, title, content, category, sensitive, pinned, last_touched_at")
    .eq("user_id", userId)
    .order("pinned", { ascending: false })
    .order("last_touched_at", { ascending: false });

  if (error || !data?.length) return null;

  const injectable = data.filter((m) => !m.sensitive || m.pinned);
  if (!injectable.length) return null;

  const byCategory = new Map<string, typeof injectable>();
  for (const m of injectable) {
    const list = byCategory.get(m.category) ?? [];
    list.push(m);
    byCategory.set(m.category, list);
  }

  const sections: string[] = [];
  for (const [category, items] of byCategory) {
    const lines = items.map((m) => `- ${m.title}: ${m.content}`);
    sections.push(`### ${category}\n${lines.join("\n")}`);
  }

  let text = sections.join("\n\n");
  if (text.length > MEMORY_INJECT_CHAR_BUDGET) {
    const condensed = await condenseMemoryTexts(
      injectable.map((m) => ({ title: m.title, content: m.content })),
    );
    text = condensed.slice(0, MEMORY_INJECT_CHAR_BUDGET);
  } else {
    text = text.slice(0, MEMORY_INJECT_CHAR_BUDGET);
  }

  // Touch injected rows lightly (fire-and-forget style update)
  const ids = injectable.slice(0, 24).map((m) => m.id);
  if (ids.length) {
    void supabase
      .from("memories")
      .update({ last_touched_at: new Date().toISOString() })
      .in("id", ids);
  }

  return text.trim() || null;
}

/**
 * After a conversation turn: maybe extract memories (async, never on stream path).
 * Call from after() — not inside the SSE handler body delay.
 */
export async function maybeExtractMemoriesForConversation(
  conversationId: string,
  opts?: {
    userId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase?: any;
  },
): Promise<{ extracted: number; skipped?: string }> {
  const supabase = opts?.supabase ?? (await createClient());
  let userId = opts?.userId;
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    userId = user.id;
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, user_id, active_leaf_id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!conversation) return { extracted: 0, skipped: "not_found" };

  const { data: allMessages, error } = await supabase
    .from("messages")
    .select("id, role, content, parent_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !allMessages?.length) {
    return { extracted: 0, skipped: "no_messages" };
  }

  const assistantCount = allMessages.filter(
    (m: { role: string }) => m.role === "assistant",
  ).length;
  if (
    assistantCount < MEMORY_EXTRACT_EVERY_N_ASSISTANT ||
    assistantCount % MEMORY_EXTRACT_EVERY_N_ASSISTANT !== 0
  ) {
    return { extracted: 0, skipped: "throttle" };
  }

  const path = resolveActivePath(
    allMessages as {
      id: string;
      parent_id: string | null;
      role: string;
      content: string;
      created_at: string;
    }[],
    conversation.active_leaf_id,
  );
  const recent = path.slice(-12) as TranscriptTurn[];

  const { data: existingRows } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId);
  const existing = (existingRows ?? []) as Memory[];

  const drafts = await extractMemoryDrafts(
    recent,
    existing.map((m) => m.title),
  );
  if (!drafts.length) return { extracted: 0, skipped: "empty" };

  let extracted = 0;
  for (const draft of drafts) {
    const match = existing.find(
      (m) => m.title.toLowerCase() === draft.title.toLowerCase(),
    );
    if (match) {
      const { error: updErr } = await supabase
        .from("memories")
        .update({
          content: draft.content,
          category: draft.category,
          sensitive: draft.sensitive || match.sensitive,
          source_conversation_id: conversationId,
          last_touched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id)
        .eq("user_id", userId);
      if (!updErr) extracted += 1;
    } else {
      const { error: insErr } = await supabase.from("memories").insert({
        user_id: userId,
        category: draft.category,
        title: draft.title,
        content: draft.content,
        sensitive: draft.sensitive,
        pinned: false,
        source_conversation_id: conversationId,
      });
      if (!insErr) extracted += 1;
    }
  }

  if (extracted) revalidatePath("/settings");
  return { extracted };
}

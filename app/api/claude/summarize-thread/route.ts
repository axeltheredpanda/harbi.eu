import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import { summarizeMessages } from "@/backend/chat/summarize";
import { resolveActivePath } from "@/backend/chat/branches";
import type { Message } from "@/backend/supabase/types";

/** Quick action: summarize the active branch of a conversation. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { conversation_id?: string };
  try {
    body = (await request.json()) as { conversation_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.conversation_id) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, active_leaf_id, summary")
    .eq("id", body.conversation_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, parent_id, created_at")
    .eq("conversation_id", body.conversation_id)
    .order("created_at", { ascending: true });

  const path = resolveActivePath(
    (messages ?? []) as Message[],
    conversation.active_leaf_id,
  );

  if (path.length === 0) {
    return NextResponse.json({ summary: "Empty conversation." });
  }

  const summary = await summarizeMessages(
    path.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    conversation.summary,
  );

  return NextResponse.json({ summary });
}

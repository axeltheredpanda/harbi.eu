import { NextResponse } from "next/server";
import { maybeExtractMemoriesForConversation } from "@/backend/chat/memories";

/** Manual / debug trigger for memory extraction (auth via session cookies). */
export async function POST(request: Request) {
  let body: { conversation_id?: string };
  try {
    body = (await request.json()) as { conversation_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.conversation_id) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }

  try {
    const result = await maybeExtractMemoriesForConversation(body.conversation_id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extract failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

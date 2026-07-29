import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/backend/anthropic";
import { SUMMARY_MODEL, TITLE_MAX_LENGTH } from "@/backend/chat/constants";

export type ConversationMeta = {
  title: string;
  topic: string;
};

export async function generateConversationTitle(
  userContent: string,
  assistantContent: string,
): Promise<ConversationMeta> {
  const userSlice = userContent.trim().slice(0, 500) || "(attachment only)";
  const assistantSlice = assistantContent.trim().slice(0, 500) || "(empty)";

  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 80,
    messages: [
      {
        role: "user",
        content: `Return ONLY compact JSON: {"title":"...","topic":"..."}
- title: 3–6 words, no quotes, no trailing punctuation
- topic: one short lowercase label (1–3 words) for analytics (e.g. "coding", "car search", "writing", "news", "debugging")

User: ${userSlice}
Assistant: ${assistantSlice}`,
      },
    ],
  });

  const raw = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join(" ")
    .trim();

  let title = "";
  let topic = "general";
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        title?: string;
        topic?: string;
      };
      title = (parsed.title ?? "").trim();
      topic = (parsed.topic ?? "general").trim().toLowerCase() || "general";
    }
  } catch {
    title = raw;
  }

  title = title
    .replace(/^["'«»]|["'«»]$/g, "")
    .replace(/[.!?]+$/g, "")
    .slice(0, TITLE_MAX_LENGTH)
    .trim();

  if (!title) {
    title =
      userContent.trim().slice(0, TITLE_MAX_LENGTH) || "New conversation";
  }

  topic = topic.slice(0, 48);

  return { title, topic };
}

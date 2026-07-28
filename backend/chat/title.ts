import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/backend/anthropic";
import { SUMMARY_MODEL, TITLE_MAX_LENGTH } from "@/backend/chat/constants";

export async function generateConversationTitle(
  userContent: string,
  assistantContent: string,
): Promise<string> {
  const userSlice = userContent.trim().slice(0, 500) || "(attachment only)";
  const assistantSlice = assistantContent.trim().slice(0, 500) || "(empty)";

  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 40,
    messages: [
      {
        role: "user",
        content: `Write a short conversation title (3–6 words). No quotes, no trailing punctuation. Capture the topic, not the tone.

User: ${userSlice}
Assistant: ${assistantSlice}`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join(" ")
    .trim()
    .replace(/^["'«»]|["'«»]$/g, "")
    .replace(/[.!?]+$/g, "")
    .slice(0, TITLE_MAX_LENGTH)
    .trim();

  return text || userContent.trim().slice(0, TITLE_MAX_LENGTH) || "New conversation";
}

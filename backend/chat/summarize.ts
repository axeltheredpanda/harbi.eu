import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/backend/anthropic";
import { SUMMARY_MODEL } from "@/backend/chat/constants";

type SummaryMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function summarizeMessages(
  older: SummaryMessage[],
  previousSummary: string | null,
): Promise<string> {
  if (older.length === 0) {
    return previousSummary ?? "";
  }

  const transcript = older
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const prompt = previousSummary
    ? `Update the running conversation summary. Keep it compact (under 400 words), factual, and retain decisions, names, and open threads.

Previous summary:
${previousSummary}

New messages to fold in:
${transcript}`
    : `Write a compact running summary of this conversation (under 400 words). Retain decisions, names, and open threads.

Transcript:
${transcript}`;

  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return text || previousSummary || "";
}

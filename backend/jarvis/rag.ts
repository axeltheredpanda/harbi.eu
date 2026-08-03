import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/backend/anthropic";
import { MAX_TOKENS } from "@/backend/chat/constants";
import {
  JARVIS_RAG_MODEL,
  JARVIS_RAG_TOP_K,
  JARVIS_SYSTEM_PROMPT,
} from "@/backend/jarvis/constants";
import { searchNotes } from "@/backend/jarvis/search";

export type RagCitation = {
  id: string;
  title: string;
};

export type RagStreamHandlers = {
  onDelta: (text: string) => void;
  onCitations: (notes: RagCitation[]) => void;
};

function buildContextBlock(
  hits: Awaited<ReturnType<typeof searchNotes>>,
): string {
  if (!hits.length) {
    return "No matching notes were retrieved for this question.";
  }
  return hits
    .map((hit, i) => {
      const body = (hit.auto_summary || hit.content).trim().slice(0, 1200);
      return `[${i + 1}] id=${hit.id} title=${JSON.stringify(hit.title)}\n${body}`;
    })
    .join("\n\n");
}

export async function streamRagAnswer(
  question: string,
  handlers: RagStreamHandlers,
): Promise<{ usage?: { input_tokens?: number; output_tokens?: number } }> {
  const hits = await searchNotes(question, JARVIS_RAG_TOP_K);
  handlers.onCitations(hits.map((h) => ({ id: h.id, title: h.title })));

  const context = buildContextBlock(hits);
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: JARVIS_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: `Retrieved notes:\n${context}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  const stream = anthropic.messages.stream({
    model: JARVIS_RAG_MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: question }],
  });

  stream.on("text", (text) => {
    handlers.onDelta(text);
  });

  const final = await stream.finalMessage();
  return {
    usage: {
      input_tokens: final.usage?.input_tokens,
      output_tokens: final.usage?.output_tokens,
    },
  };
}

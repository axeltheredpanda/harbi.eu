import type Anthropic from "@anthropic-ai/sdk";
import type { Attachment, Message } from "@/backend/supabase/types";
import {
  formatProfileForPrompt,
  profileHasContent,
  type ClaudetteProfile,
} from "@/backend/claudette/profile";
import { BASE_SYSTEM_PROMPT, CONTEXT_WINDOW } from "@/backend/chat/constants";

export type ContextMessage = Message & { attachments: Attachment[] };

export type BuiltContext = {
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  olderMessages: ContextMessage[];
  windowMessages: ContextMessage[];
  needsSummaryRefresh: boolean;
};

function mediaTypeFromPath(path: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function splitContextWindow(all: ContextMessage[]): {
  older: ContextMessage[];
  window: ContextMessage[];
} {
  if (all.length <= CONTEXT_WINDOW) {
    return { older: [], window: all };
  }
  return {
    older: all.slice(0, all.length - CONTEXT_WINDOW),
    window: all.slice(all.length - CONTEXT_WINDOW),
  };
}

export function collectPdfTexts(
  messages: ContextMessage[],
  summaryUntilMessageId: string | null,
): string[] {
  const texts: string[] = [];
  for (const message of messages) {
    for (const attachment of message.attachments) {
      if (attachment.type === "pdf" && attachment.extracted_text) {
        texts.push(attachment.extracted_text);
      }
    }
  }
  void summaryUntilMessageId;
  return texts;
}

export function buildSystemBlocks(
  summary: string | null,
  pdfTexts: string[],
  profile?: ClaudetteProfile | null,
  memoryBlock?: string | null,
): Anthropic.TextBlockParam[] {
  const blocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: BASE_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];

  if (profile && profileHasContent(profile)) {
    const formatted = formatProfileForPrompt(profile);
    if (formatted) {
      blocks.push({
        type: "text",
        text: `Private user profile (use only when relevant to the current message):\n${formatted}`,
        cache_control: { type: "ephemeral" },
      });
    }
  }

  if (memoryBlock?.trim()) {
    blocks.push({
      type: "text",
      text: `Long-term memories (durable facts across chats — use only when relevant; never invent beyond these):\n${memoryBlock.trim()}`,
      cache_control: { type: "ephemeral" },
    });
  }

  if (summary?.trim()) {
    blocks.push({
      type: "text",
      text: `Running conversation summary (earlier turns not included verbatim):\n${summary.trim()}`,
      cache_control: { type: "ephemeral" },
    });
  }

  for (const [index, pdfText] of pdfTexts.entries()) {
    if (!pdfText.trim()) continue;
    blocks.push({
      type: "text",
      text: `Extracted PDF content #${index + 1}:\n${pdfText}`,
      cache_control: { type: "ephemeral" },
    });
  }

  return blocks;
}

export async function buildAnthropicMessages(
  windowMessages: ContextMessage[],
  imageBytesByAttachmentId: Map<string, { data: string; mediaType: string }>,
): Promise<Anthropic.MessageParam[]> {
  const result: Anthropic.MessageParam[] = [];

  for (let i = 0; i < windowMessages.length; i++) {
    const message = windowMessages[i];
    const isLastUser =
      message.role === "user" && i === windowMessages.length - 1;

    if (message.role === "assistant") {
      result.push({ role: "assistant", content: message.content });
      continue;
    }

    const content: Anthropic.ContentBlockParam[] = [];

    if (isLastUser) {
      for (const attachment of message.attachments) {
        if (attachment.type !== "image") continue;
        const bytes = imageBytesByAttachmentId.get(attachment.id);
        if (!bytes) continue;
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: (bytes.mediaType ||
              mediaTypeFromPath(attachment.storage_path)) as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: bytes.data,
          },
        });
      }
    }

    const pdfNames = message.attachments
      .filter((a) => a.type === "pdf")
      .map((a) => a.storage_path.split("/").pop() ?? "document.pdf");

    let text = message.content;
    if (pdfNames.length > 0 && !isLastUser) {
      // Older turns: PDFs live in cached system blocks; mention filenames only.
      text = [text, `[Attached PDFs: ${pdfNames.join(", ")}]`].filter(Boolean).join("\n");
    } else if (pdfNames.length > 0 && isLastUser) {
      text = [text, `[Attached PDFs (full text in system context): ${pdfNames.join(", ")}]`].filter(Boolean).join("\n");
    }

    if (text.trim()) {
      content.push({ type: "text", text });
    } else if (content.length === 0) {
      content.push({ type: "text", text: "(empty message)" });
    }

    result.push({ role: "user", content });
  }

  return result;
}

export function prepareContext(
  allMessages: ContextMessage[],
  summary: string | null,
  summaryUntilMessageId: string | null,
  profile?: ClaudetteProfile | null,
  memoryBlock?: string | null,
): BuiltContext {
  const { older, window } = splitContextWindow(allMessages);

  const pdfSource = [...older, ...window];
  const pdfTexts = collectPdfTexts(pdfSource, summaryUntilMessageId);

  const lastSummarizedIndex = summaryUntilMessageId
    ? older.findIndex((m) => m.id === summaryUntilMessageId)
    : -1;

  const unsummarizedOlder =
    lastSummarizedIndex >= 0 ? older.slice(lastSummarizedIndex + 1) : older;

  const needsSummaryRefresh = unsummarizedOlder.length > 0;

  return {
    system: buildSystemBlocks(summary, pdfTexts, profile, memoryBlock),
    messages: [],
    olderMessages: older,
    windowMessages: window,
    needsSummaryRefresh,
  };
}

export { mediaTypeFromPath };

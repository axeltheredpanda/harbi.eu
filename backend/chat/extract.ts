import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/backend/anthropic";
import { SUMMARY_MODEL } from "@/backend/chat/constants";

/**
 * Shared Haiku extraction for sliding-window compression AND long-term memory.
 * One mechanism, two consumers.
 */

export type TranscriptTurn = {
  role: "user" | "assistant";
  content: string;
};

export type MemoryCategory =
  | "personal"
  | "projects"
  | "preferences"
  | "ongoing"
  | "other";

export type ExtractedMemoryDraft = {
  category: MemoryCategory;
  title: string;
  content: string;
  /** True when the fact touches health, precise finances, credentials, etc. */
  sensitive: boolean;
};

const CATEGORIES = new Set<MemoryCategory>([
  "personal",
  "projects",
  "preferences",
  "ongoing",
  "other",
]);

function textFromResponse(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function formatTranscript(turns: TranscriptTurn[]): string {
  return turns
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n")
    .slice(0, 24_000);
}

/** Sliding context-window compression (existing summarize path). */
export async function summarizeMessages(
  older: TranscriptTurn[],
  previousSummary: string | null,
): Promise<string> {
  if (older.length === 0) {
    return previousSummary ?? "";
  }

  const transcript = formatTranscript(older);
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

  return textFromResponse(response) || previousSummary || "";
}

/** Async durable-memory extraction (never on the live stream path). */
export async function extractMemoryDrafts(
  turns: TranscriptTurn[],
  existingTitles: string[],
): Promise<ExtractedMemoryDraft[]> {
  if (turns.length === 0) return [];

  const transcript = formatTranscript(turns);
  const existing =
    existingTitles.length > 0
      ? `Already stored titles (prefer update/merge over duplicates):\n- ${existingTitles.join("\n- ")}`
      : "No existing memories yet.";

  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 900,
    messages: [
      {
        role: "user",
        content: `Extract durable facts worth remembering across future chats.
Return ONLY JSON: {"memories":[{"category":"personal|projects|preferences|ongoing|other","title":"...","content":"...","sensitive":false}]}

Rules:
- Prefer 0–6 thematic entries (not one blob). Skip ephemeral chitchat.
- category hints: personal = identity/people/places; projects = Axel Project / CRM / named work; preferences = tone & response style; ongoing = active threads; other = misc durable facts.
- NEVER include health details, precise financial amounts/account numbers, passwords, or credentials. If such content appears, omit it (do not set sensitive:true for those — omit entirely).
- Mark sensitive:true only for borderline private facts the user might still want to pin manually (e.g. workplace politics). Prefer omit.
- title ≤ 60 chars; content ≤ 280 chars; factual, third-person about the owner.
- Skip anything already covered by existing titles unless you have a clear update.

${existing}

Transcript:
${transcript}`,
      },
    ],
  });

  const raw = textFromResponse(response);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as {
      memories?: Array<{
        category?: string;
        title?: string;
        content?: string;
        sensitive?: boolean;
      }>;
    };
    const list = Array.isArray(parsed.memories) ? parsed.memories : [];
    return list
      .map((item) => {
        const category = (item.category ?? "other") as MemoryCategory;
        if (!CATEGORIES.has(category)) return null;
        const title = String(item.title ?? "").trim().slice(0, 80);
        const content = String(item.content ?? "").trim().slice(0, 400);
        if (!title || !content) return null;
        return {
          category,
          title,
          content,
          sensitive: Boolean(item.sensitive),
        } satisfies ExtractedMemoryDraft;
      })
      .filter((x): x is ExtractedMemoryDraft => x != null)
      .slice(0, 8);
  } catch {
    return [];
  }
}

/** Condense bloated memory entries when total budget is exceeded. */
export async function condenseMemoryTexts(
  entries: { title: string; content: string }[],
): Promise<string> {
  if (entries.length === 0) return "";
  const blob = entries
    .map((e) => `## ${e.title}\n${e.content}`)
    .join("\n\n")
    .slice(0, 12_000);

  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Condense these long-term memory notes into a tighter bullet list (max ~350 words). Keep distinct themes. Drop redundancy.

${blob}`,
      },
    ],
  });

  return textFromResponse(response);
}

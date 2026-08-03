import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/backend/anthropic";
import { createJarvisClient } from "@/backend/jarvis/db";
import { JARVIS_HAIKU } from "@/backend/jarvis/constants";
import { hashNoteContent } from "@/backend/jarvis/hash";
import { syncWikiLinks } from "@/backend/jarvis/notes";
import { embedDocument } from "@/backend/jarvis/voyage";

export type ProcessResult = {
  skipped: boolean;
  reason?: string;
  auto_tags?: string[];
  auto_summary?: string | null;
  content_hash?: string;
};

async function generateTagsAndSummary(
  title: string,
  content: string,
): Promise<{ tags: string[]; summary: string }> {
  const slice = `${title}\n\n${content}`.trim().slice(0, 6000) || "(empty)";
  const response = await anthropic.messages.create({
    model: JARVIS_HAIKU,
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Return ONLY JSON: {"summary":"...","tags":["..."]}
- summary: one tight sentence (max ~160 chars)
- tags: 2-5 short lowercase tags

Note:
${slice}`,
      },
    ],
  });

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .trim();

  let summary = "";
  let tags: string[] = [];
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as {
        summary?: string;
        tags?: string[];
      };
      summary = (parsed.summary ?? "").trim().slice(0, 220);
      tags = (parsed.tags ?? [])
        .map((t) => String(t).trim().toLowerCase().slice(0, 32))
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch {
    summary = raw.slice(0, 160);
  }

  if (!summary) summary = content.trim().slice(0, 140) || "Empty note.";
  return { tags, summary };
}

/**
 * Process a note with Haiku (tags/summary) + Voyage embedding + wiki links.
 * Skips when content_hash === processed_hash (unchanged since last pass).
 */
export async function processNoteIfChanged(
  noteId: string,
): Promise<ProcessResult> {
  const supabase = await createJarvisClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: note, error } = await supabase
    .from("notes")
    .select(
      "id, title, content, content_hash, processed_hash, auto_summary, auto_tags, user_id",
    )
    .eq("id", noteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !note) throw new Error(error?.message ?? "Note not found");

  const nextHash = hashNoteContent(note.title, note.content);
  if (note.processed_hash && note.processed_hash === nextHash) {
    return {
      skipped: true,
      reason: "unchanged",
      auto_tags: note.auto_tags ?? [],
      auto_summary: note.auto_summary,
      content_hash: nextHash,
    };
  }

  const body = `${note.title}\n\n${note.content}`.trim();
  const [{ tags, summary }, embedding] = await Promise.all([
    body
      ? generateTagsAndSummary(note.title, note.content)
      : Promise.resolve({ tags: [] as string[], summary: "Empty note." }),
    body
      ? embedDocument(body).catch((err: unknown) => {
          console.warn("Voyage embed skipped:", err);
          return null;
        })
      : Promise.resolve(null),
  ]);

  const update: Record<string, unknown> = {
    auto_tags: tags,
    auto_summary: summary,
    content_hash: nextHash,
    processed_hash: nextHash,
    updated_at: new Date().toISOString(),
  };
  if (embedding) {
    // pgvector accepts number[] via PostgREST as string form "[1,2,...]"
    update.embedding = `[${embedding.join(",")}]`;
  }

  const { error: updateError } = await supabase
    .from("notes")
    .update(update)
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (updateError) throw new Error(updateError.message);

  await syncWikiLinks(noteId, note.content).catch((err) => {
    console.warn("wiki links", err);
  });

  return {
    skipped: false,
    auto_tags: tags,
    auto_summary: summary,
    content_hash: nextHash,
  };
}

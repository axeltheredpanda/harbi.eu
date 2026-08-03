"use server";

import { revalidatePath } from "next/cache";
import { createJarvisClient } from "@/backend/jarvis/db";
import { hashNoteContent } from "@/backend/jarvis/hash";
import { extractWikiTitles, wikiTitleKey } from "@/backend/jarvis/wiki";

export type JarvisNote = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  content_hash: string | null;
  auto_tags: string[];
  auto_summary: string | null;
  is_daily_note: boolean;
  daily_note_date: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteLinkRef = {
  id: string;
  title: string;
};

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function requireUser() {
  const supabase = await createJarvisClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function listRecentNotes(limit = 24): Promise<JarvisNote[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, user_id, title, content, content_hash, auto_tags, auto_summary, is_daily_note, daily_note_date, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as JarvisNote[];
}

export async function getNote(id: string): Promise<JarvisNote | null> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, user_id, title, content, content_hash, auto_tags, auto_summary, is_daily_note, daily_note_date, created_at, updated_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as JarvisNote | null) ?? null;
}

export async function createNote(input?: {
  title?: string;
  content?: string;
}): Promise<JarvisNote> {
  const { supabase, user } = await requireUser();
  const title = (input?.title ?? "Untitled").trim() || "Untitled";
  const content = input?.content ?? "";
  const content_hash = hashNoteContent(title, content);
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title,
      content,
      content_hash,
    })
    .select(
      "id, user_id, title, content, content_hash, auto_tags, auto_summary, is_daily_note, daily_note_date, created_at, updated_at",
    )
    .single();
  if (error || !data) throw new Error(error?.message ?? "Create failed");
  revalidatePath("/today");
  return data as JarvisNote;
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: string },
): Promise<JarvisNote> {
  const { supabase, user } = await requireUser();
  const existing = await getNote(id);
  if (!existing) throw new Error("Note not found");

  const title = patch.title !== undefined ? patch.title : existing.title;
  const content = patch.content !== undefined ? patch.content : existing.content;
  const content_hash = hashNoteContent(title, content);

  const { data, error } = await supabase
    .from("notes")
    .update({
      title: title.trim() || "Untitled",
      content,
      content_hash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, user_id, title, content, content_hash, auto_tags, auto_summary, is_daily_note, daily_note_date, created_at, updated_at",
    )
    .single();
  if (error || !data) throw new Error(error?.message ?? "Update failed");
  revalidatePath("/today");
  revalidatePath(`/today/notes/${id}`);
  return data as JarvisNote;
}

export async function deleteNote(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/today");
}

/** Get or create today's daily note. */
export async function getOrCreateDailyNote(
  date = todayUtcDate(),
): Promise<JarvisNote> {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("notes")
    .select(
      "id, user_id, title, content, content_hash, auto_tags, auto_summary, is_daily_note, daily_note_date, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .eq("is_daily_note", true)
    .eq("daily_note_date", date)
    .maybeSingle();

  if (existing) return existing as JarvisNote;

  const title = `Daily · ${date}`;
  const content = "";
  const content_hash = hashNoteContent(title, content);
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title,
      content,
      content_hash,
      is_daily_note: true,
      daily_note_date: date,
    })
    .select(
      "id, user_id, title, content, content_hash, auto_tags, auto_summary, is_daily_note, daily_note_date, created_at, updated_at",
    )
    .single();
  if (error || !data) throw new Error(error?.message ?? "Daily note failed");
  revalidatePath("/today");
  return data as JarvisNote;
}

export async function listBacklinks(noteId: string): Promise<NoteLinkRef[]> {
  const { supabase, user } = await requireUser();
  const { data: links } = await supabase
    .from("note_links")
    .select("source_note_id")
    .eq("target_note_id", noteId);
  const ids = (links ?? []).map((l: { source_note_id: string }) => l.source_note_id);
  if (!ids.length) return [];
  const { data: notes } = await supabase
    .from("notes")
    .select("id, title")
    .eq("user_id", user.id)
    .in("id", ids);
  return (notes ?? []).map((n: { id: string; title: string }) => ({
    id: n.id,
    title: n.title,
  }));
}

export async function syncWikiLinks(
  sourceId: string,
  content: string,
): Promise<void> {
  const { supabase, user } = await requireUser();
  const titles = extractWikiTitles(content);
  const { data: allNotes } = await supabase
    .from("notes")
    .select("id, title")
    .eq("user_id", user.id);

  const byKey = new Map(
    (allNotes ?? []).map((n) => [wikiTitleKey(n.title), n.id as string]),
  );

  const targetIds = new Set<string>();
  for (const title of titles) {
    const id = byKey.get(wikiTitleKey(title));
    if (id && id !== sourceId) targetIds.add(id);
  }

  await supabase.from("note_links").delete().eq("source_note_id", sourceId);

  if (targetIds.size) {
    const rows = [...targetIds].map((target_note_id) => ({
      source_note_id: sourceId,
      target_note_id,
    }));
    const { error } = await supabase.from("note_links").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function listNotesForGraph(): Promise<
  { id: string; title: string; links: string[] }[]
> {
  const { supabase, user } = await requireUser();
  const { data: notes } = await supabase
    .from("notes")
    .select("id, title")
    .eq("user_id", user.id)
    .order("title");
  const { data: links } = await supabase
    .from("note_links")
    .select("source_note_id, target_note_id");

  const linkMap = new Map<string, string[]>();
  for (const link of links ?? []) {
    const list = linkMap.get(link.source_note_id) ?? [];
    list.push(link.target_note_id);
    linkMap.set(link.source_note_id, list);
  }

  return (notes ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    links: linkMap.get(n.id) ?? [],
  }));
}

export async function pickResurfaceNote(): Promise<JarvisNote | null> {
  const { supabase, user } = await requireUser();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 14);
  const { data } = await supabase
    .from("notes")
    .select(
      "id, user_id, title, content, content_hash, auto_tags, auto_summary, is_daily_note, daily_note_date, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .eq("is_daily_note", false)
    .lt("updated_at", cutoff.toISOString())
    .order("updated_at", { ascending: true })
    .limit(40);

  const rows = (data ?? []) as JarvisNote[];
  if (!rows.length) return null;
  const daySeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  return rows[daySeed % rows.length] ?? null;
}

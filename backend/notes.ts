import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type NoteMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

export type Note = NoteMeta & {
  content: string;
};

const NOTES_DIR = path.join(process.cwd(), "content/notes");

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = value;
  }
  return { data, body: match[2].trim() };
}

export async function listNotes(): Promise<NoteMeta[]> {
  const files = await readdir(NOTES_DIR);
  const notes: NoteMeta[] = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const raw = await readFile(path.join(NOTES_DIR, file), "utf8");
    const { data } = parseFrontmatter(raw);
    notes.push({
      slug: file.replace(/\.md$/, ""),
      title: data.title ?? file,
      date: data.date ?? "",
      excerpt: data.excerpt ?? "",
    });
  }

  return notes.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getNote(slug: string): Promise<Note | null> {
  try {
    const raw = await readFile(path.join(NOTES_DIR, `${slug}.md`), "utf8");
    const { data, body } = parseFrontmatter(raw);
    return {
      slug,
      title: data.title ?? slug,
      date: data.date ?? "",
      excerpt: data.excerpt ?? "",
      content: body,
    };
  } catch {
    return null;
  }
}

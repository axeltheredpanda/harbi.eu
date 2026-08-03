import { createHash } from "node:crypto";
import { JARVIS_MAX_NOTE_CHARS } from "@/backend/jarvis/constants";

export function hashNoteContent(title: string, content: string): string {
  const normalized = `${title.trim()}\n${content.trim()}`.slice(
    0,
    JARVIS_MAX_NOTE_CHARS,
  );
  return createHash("sha256").update(normalized).digest("hex");
}

export async function sha256Browser(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

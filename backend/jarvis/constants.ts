import { SUMMARY_MODEL } from "@/backend/chat/constants";

/** Haiku for mechanical Jarvis tasks (tags, summaries, titles, briefing). */
export const JARVIS_HAIKU = SUMMARY_MODEL;

/** Sonnet only where reasoning quality matters (RAG answers). */
export const JARVIS_RAG_MODEL = "claude-sonnet-4-6";

export const JARVIS_PROCESS_DEBOUNCE_MS = 2500;
export const JARVIS_RAG_TOP_K = 6;
export const JARVIS_SEARCH_TOP_K = 8;
export const JARVIS_EMBED_MODEL = "voyage-3-lite";
export const JARVIS_EMBED_DIMS = 512;
export const JARVIS_MAX_NOTE_CHARS = 80_000;

export const JARVIS_PROCESSING_PHRASES = [
  "indexing the thought…",
  "folding tags into the margin…",
  "sketching a one-line summary…",
  "etching the embedding…",
  "tucking wiki links away…",
] as const;

export const JARVIS_ASK_PHRASES = [
  "reading your notes…",
  "pulling the right pages…",
  "crossing references…",
  "composing an answer…",
] as const;

export const JARVIS_SYSTEM_PROMPT = `You are Claudette answering from the owner's private notes (Jarvis memory).
Use ONLY the provided note excerpts as factual ground. If the notes do not cover the question, say so briefly.
When you use a fact from a note, cite it inline as [[note:NOTE_ID]] right after the claim (use the exact id given).
Be concise, editorial, and practical. Do not invent notes or ids.`;

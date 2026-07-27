export const CHAT_MODEL = "claude-sonnet-4-6";
export const SUMMARY_MODEL = "claude-haiku-4-5";
export const CONTEXT_WINDOW = 20;
export const MAX_TOKENS = 4096;
export const TITLE_MAX_LENGTH = 60;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const CHAT_STORAGE_BUCKET = "chat-attachments";

export const BASE_SYSTEM_PROMPT = `You are Claudette, a personal AI assistant for the owner of harbi.eu.
Be concise, practical, and precise. Prefer clear structure when answering technical questions.
When the user shares documents or images, use them only as context for the current task.`;

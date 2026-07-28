export const CHAT_MODEL = "claude-sonnet-4-6";
export const SUMMARY_MODEL = "claude-haiku-4-5";
export const CONTEXT_WINDOW = 20;
export const MAX_TOKENS = 4096;
export const TITLE_MAX_LENGTH = 60;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const CHAT_STORAGE_BUCKET = "chat-attachments";

export const CHAT_MODELS = [
  { id: "claude-haiku-4-5", label: "Haiku 4.5", hint: "Fast" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", hint: "Default" },
  { id: "claude-sonnet-5", label: "Sonnet 5", hint: "Balanced" },
  { id: "claude-opus-4-8", label: "Opus 4.8", hint: "Strong" },
  { id: "claude-opus-5", label: "Opus 5", hint: "Max" },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

const CHAT_MODEL_IDS = new Set<string>(CHAT_MODELS.map((model) => model.id));

export function isChatModelId(value: string): value is ChatModelId {
  return CHAT_MODEL_IDS.has(value);
}

export function resolveChatModel(value?: string | null): ChatModelId {
  if (value && isChatModelId(value)) return value;
  return CHAT_MODEL;
}

export const BASE_SYSTEM_PROMPT = `You are Claudette, a personal AI assistant for the owner of harbi.eu.
Be concise, practical, and precise. Prefer clear structure when answering technical questions.
When the user shares documents or images, use them only as context for the current task.`;

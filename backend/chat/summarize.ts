// Re-export so existing imports keep working — shared Haiku extraction lives in extract.ts
export {
  summarizeMessages,
  extractMemoryDrafts,
  condenseMemoryTexts,
  type TranscriptTurn,
  type MemoryCategory,
  type ExtractedMemoryDraft,
} from "@/backend/chat/extract";

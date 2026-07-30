import type { InputFormat, OutputFormat } from "@/backend/convert/constants";
import {
  CONVERT_HISTORY_KEY,
  CONVERT_HISTORY_LIMIT,
} from "@/backend/convert/constants";

export type ConvertHistoryItem = {
  id: string;
  filename: string;
  sourceFormat: InputFormat;
  targetFormat: OutputFormat;
  inputBytes: number;
  outputBytes: number;
  createdAt: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadConvertHistory(): ConvertHistoryItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(CONVERT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConvertHistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, CONVERT_HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

export function pushConvertHistory(
  item: Omit<ConvertHistoryItem, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): ConvertHistoryItem[] {
  const entry: ConvertHistoryItem = {
    id: item.id ?? crypto.randomUUID(),
    filename: item.filename,
    sourceFormat: item.sourceFormat,
    targetFormat: item.targetFormat,
    inputBytes: item.inputBytes,
    outputBytes: item.outputBytes,
    createdAt: item.createdAt ?? new Date().toISOString(),
  };
  const next = [entry, ...loadConvertHistory().filter((h) => h.id !== entry.id)].slice(
    0,
    CONVERT_HISTORY_LIMIT,
  );
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(CONVERT_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // quota - ignore
    }
  }
  return next;
}

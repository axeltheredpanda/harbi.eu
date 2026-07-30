import type { InputFormat, OutputFormat } from "@/backend/convert/constants";
import {
  OUTPUT_EXT,
  OUTPUT_FORMATS,
} from "@/backend/convert/constants";

const EXT_TO_INPUT: Record<string, InputFormat> = {
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  webp: "webp",
  avif: "avif",
  gif: "gif",
  bmp: "bmp",
  tif: "tiff",
  tiff: "tiff",
  heic: "heic",
  heif: "heic",
};

const MIME_TO_INPUT: Record<string, InputFormat> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/x-ms-bmp": "bmp",
  "image/tiff": "tiff",
  "image/tif": "tiff",
  "image/heic": "heic",
  "image/heif": "heic",
  "image/heic-sequence": "heic",
  "image/heif-sequence": "heic",
};

export function detectInputFormat(file: File): InputFormat {
  const mime = (file.type || "").toLowerCase();
  if (mime && MIME_TO_INPUT[mime]) return MIME_TO_INPUT[mime];

  const name = file.name || "";
  const ext = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (ext && EXT_TO_INPUT[ext]) return EXT_TO_INPUT[ext];

  return "unknown";
}

export function isAcceptedConvertFile(file: File): boolean {
  const format = detectInputFormat(file);
  if (format !== "unknown") return true;
  // Clipboard pastes sometimes omit type + name
  return !file.type || file.type.startsWith("image/");
}

export function defaultOutputFor(input: InputFormat): OutputFormat {
  if (input === "heic" || input === "tiff" || input === "gif" || input === "bmp") {
    return "jpeg";
  }
  if (input === "jpeg") return "webp";
  if (input === "png") return "webp";
  if (input === "webp") return "png";
  if (input === "avif") return "jpeg";
  return "png";
}

export function replaceExtension(filename: string, format: OutputFormat): string {
  const base = filename.replace(/\.[^.]+$/, "") || "converted";
  return `${base}.${OUTPUT_EXT[format]}`;
}

export function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as readonly string[]).includes(value);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function sizeDeltaLabel(
  inputBytes: number,
  outputBytes: number,
): { text: string; saved: boolean; pct: number } {
  if (inputBytes <= 0) {
    return { text: formatBytes(outputBytes), saved: true, pct: 0 };
  }
  const diff = inputBytes - outputBytes;
  const pct = Math.round((Math.abs(diff) / inputBytes) * 100);
  if (diff >= 0) {
    return { text: `${pct}% smaller`, saved: true, pct };
  }
  return { text: `${pct}% larger`, saved: false, pct };
}

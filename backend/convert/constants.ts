/** Output formats the converter can encode client-side. */
export type OutputFormat = "png" | "jpeg" | "webp" | "avif" | "bmp";

/** Detected / declared input formats. */
export type InputFormat =
  | OutputFormat
  | "gif"
  | "tiff"
  | "heic"
  | "unknown";

export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  "png",
  "jpeg",
  "webp",
  "avif",
  "bmp",
] as const;

export const OUTPUT_MIME: Record<OutputFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
};

export const OUTPUT_EXT: Record<OutputFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
  avif: "avif",
  bmp: "bmp",
};

export const OUTPUT_LABEL: Record<OutputFormat, string> = {
  png: "PNG",
  jpeg: "JPG",
  webp: "WebP",
  avif: "AVIF",
  bmp: "BMP",
};

export const MAX_CONVERT_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_CONVERT_BATCH = 24;
export const CONVERT_HISTORY_KEY = "harbi.convert.history.v1";
export const CONVERT_HISTORY_LIMIT = 24;

export const DEFAULT_QUALITY = 0.85;

export function badgeExt(format: InputFormat | OutputFormat): string {
  if (format === "jpeg") return ".JPG";
  if (format === "heic") return ".HEIC";
  if (format === "tiff") return ".TIFF";
  if (format === "unknown") return ".IMG";
  return `.${format.toUpperCase()}`;
}

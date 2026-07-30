import { decodeImageFile } from "@/frontend/convert/decode";
import { encodeImage } from "@/frontend/convert/encode";
import type { OutputFormat } from "@/backend/convert/constants";

export type ConvertRequest = {
  file: File;
  format: OutputFormat;
  quality: number;
  width?: number | null;
  height?: number | null;
  onProgress?: (ratio: number) => void;
};

export type ConvertResult = {
  blob: Blob;
  width: number;
  height: number;
  sourceFormat: Awaited<ReturnType<typeof decodeImageFile>>["sourceFormat"];
};

/**
 * Full client-side convert pipeline with coarse progress callbacks.
 */
export async function convertImageFile(
  req: ConvertRequest,
): Promise<ConvertResult> {
  req.onProgress?.(0.08);
  const decoded = await decodeImageFile(req.file);
  req.onProgress?.(0.45);
  try {
    const blob = await encodeImage(decoded.bitmap, decoded.width, decoded.height, {
      format: req.format,
      quality: req.quality,
      width: req.width,
      height: req.height,
    });
    req.onProgress?.(1);
    return {
      blob,
      width: decoded.width,
      height: decoded.height,
      sourceFormat: decoded.sourceFormat,
    };
  } finally {
    decoded.bitmap.close();
  }
}

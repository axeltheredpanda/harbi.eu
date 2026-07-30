import type { InputFormat } from "@/backend/convert/constants";
import { detectInputFormat } from "@/frontend/convert/formats";

export type DecodedImage = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  sourceFormat: InputFormat;
};

async function bitmapFromBlob(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

async function decodeViaImageElement(blob: Blob): Promise<ImageBitmap> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn’t decode image"));
      el.src = url;
    });
    return createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeHeic(file: File): Promise<ImageBitmap> {
  const { heicTo } = await import("heic-to/next");
  return heicTo({ blob: file, type: "bitmap" });
}

async function decodeTiff(file: File): Promise<ImageBitmap> {
  const UTIF = (await import("utif")).default;
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (!ifds.length) throw new Error("Empty TIFF");
  UTIF.decodeImage(buffer, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]);
  const width = ifds[0].width as number;
  const height = ifds[0].height as number;
  const pixels = new Uint8ClampedArray(rgba.length);
  pixels.set(rgba);
  const imageData = new ImageData(pixels, width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.putImageData(imageData, 0, 0);
  return createImageBitmap(canvas);
}

/**
 * Decode any supported input into an ImageBitmap.
 * HEIC/TIFF use on-demand WASM / UTIF; everything else uses the browser.
 */
export async function decodeImageFile(file: File): Promise<DecodedImage> {
  let sourceFormat = detectInputFormat(file);

  if (sourceFormat === "unknown" || sourceFormat === "heic") {
    try {
      const { isHeic } = await import("heic-to/next");
      if (await isHeic(file)) sourceFormat = "heic";
    } catch {
      // ignore probe failures
    }
  }

  let bitmap: ImageBitmap;
  if (sourceFormat === "heic") {
    bitmap = await decodeHeic(file);
  } else if (sourceFormat === "tiff") {
    bitmap = await decodeTiff(file);
  } else {
    try {
      bitmap = await bitmapFromBlob(file);
    } catch {
      bitmap = await decodeViaImageElement(file);
    }
  }

  return {
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
    sourceFormat,
  };
}

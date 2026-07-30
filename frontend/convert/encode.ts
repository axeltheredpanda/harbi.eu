import type { OutputFormat } from "@/backend/convert/constants";
import { OUTPUT_MIME } from "@/backend/convert/constants";

export type EncodeOptions = {
  format: OutputFormat;
  /** 0–1, used for jpeg / webp / avif */
  quality: number;
  /** Optional resize target (keeps aspect if only one side set). */
  width?: number | null;
  height?: number | null;
};

function clampQuality(q: number): number {
  if (!Number.isFinite(q)) return 0.85;
  return Math.min(1, Math.max(0.05, q));
}

function targetSize(
  srcW: number,
  srcH: number,
  width?: number | null,
  height?: number | null,
): { w: number; h: number } {
  const w = width && width > 0 ? Math.round(width) : null;
  const h = height && height > 0 ? Math.round(height) : null;
  if (!w && !h) return { w: srcW, h: srcH };
  if (w && h) return { w, h };
  if (w) return { w, h: Math.max(1, Math.round((srcH / srcW) * w)) };
  return { w: Math.max(1, Math.round((srcW / srcH) * (h as number))), h: h as number };
}

export function drawToCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  opts: {
    width?: number | null;
    height?: number | null;
    /** Flat fill under transparent pixels (lossy / BMP). */
    matte?: string | null;
  } = {},
): HTMLCanvasElement {
  const { w, h } = targetSize(srcW, srcH, opts.width, opts.height);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  if (opts.matte) {
    ctx.fillStyle = opts.matte;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}

function encodeBmp(imageData: ImageData): Blob {
  const { width, height, data } = imageData;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelSize = rowSize * height;
  const fileSize = 54 + pixelSize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42); // B
  view.setUint8(1, 0x4d); // M
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  // BITMAPINFOHEADER
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // top-down
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelSize, true);

  let offset = 54;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      bytes[offset++] = data[i + 2]!; // B
      bytes[offset++] = data[i + 1]!; // G
      bytes[offset++] = data[i]!; // R
    }
    offset += rowSize - width * 3;
  }

  return new Blob([buffer], { type: "image/bmp" });
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Encode failed (${type})`))),
      type,
      quality,
    );
  });
}

let avifReady: Promise<void> | null = null;

async function ensureAvifEncoder() {
  if (!avifReady) {
    avifReady = (async () => {
      const { init } = await import("@jsquash/avif/encode");
      await init({
        locateFile: (path: string) => {
          if (path.includes("avif_enc_mt")) {
            return "/wasm/avif/avif_enc_mt.wasm";
          }
          if (path.endsWith(".wasm") || path.includes("avif_enc")) {
            return "/wasm/avif/avif_enc.wasm";
          }
          return path;
        },
      });
    })();
  }
  await avifReady;
}

async function encodeAvif(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  await ensureAvifEncoder();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const encode = (await import("@jsquash/avif/encode")).default;
  // Squoosh quality is 0–100; map 0–1 → cqLevel inverted-ish via quality option
  const q = clampQuality(quality);
  const encoded = await encode(imageData, {
    quality: Math.round(q * 100),
  });
  return new Blob([encoded], { type: "image/avif" });
}

/**
 * Encode a decoded bitmap to the target format via Canvas (+ WASM for AVIF).
 */
export async function encodeImage(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  options: EncodeOptions,
): Promise<Blob> {
  const quality = clampQuality(options.quality);
  const format = options.format;
  // Lossy + BMP can't keep alpha - matte onto cream paper instead of black.
  const canvas = drawToCanvas(source, srcW, srcH, {
    width: options.width,
    height: options.height,
    matte: format === "png" ? null : "#faf6f0",
  });

  if (format === "bmp") {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    return encodeBmp(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  if (format === "avif") {
    return encodeAvif(canvas, quality);
  }

  if (format === "png") {
    return canvasToBlob(canvas, OUTPUT_MIME.png);
  }

  return canvasToBlob(canvas, OUTPUT_MIME[format], quality);
}

import type { CutoutMode } from "@/backend/cutout/constants";

/** Map UI mode → imgly ISNet variant. */
export function modelForMode(
  mode: CutoutMode,
): "isnet" | "isnet_fp16" | "isnet_quint8" {
  // quint8 = smaller/faster; full isnet = higher quality
  return mode === "fast" ? "isnet_quint8" : "isnet";
}

export async function sha256Hex(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Client-side background removal (ONNX in the browser).
 * First call may download the model - treat as a warm-up.
 */
export async function removeBackgroundInBrowser(
  file: Blob,
  mode: CutoutMode,
): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(file, {
    model: modelForMode(mode),
    output: { format: "image/png", quality: 0.92 },
  });
}

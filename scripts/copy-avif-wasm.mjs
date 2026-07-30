#!/usr/bin/env node
/**
 * Copy Squoosh AVIF encoder WASM into public/ so Turbopack can serve it
 * without bundling issues. Safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const destDir = path.join(root, "public/wasm/avif");
const files = [
  ["node_modules/@jsquash/avif/codec/enc/avif_enc.wasm", "avif_enc.wasm"],
  ["node_modules/@jsquash/avif/codec/enc/avif_enc_mt.wasm", "avif_enc_mt.wasm"],
];

if (!fs.existsSync(path.join(root, "node_modules/@jsquash/avif"))) {
  console.warn("[copy-avif-wasm] @jsquash/avif not installed - skip");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
for (const [from, name] of files) {
  const src = path.join(root, from);
  const dest = path.join(destDir, name);
  fs.copyFileSync(src, dest);
  console.log("[copy-avif-wasm] wrote", path.relative(root, dest));
}

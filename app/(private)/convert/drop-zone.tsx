"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { isAcceptedConvertFile } from "@/frontend/convert/formats";

type Props = {
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  children?: ReactNode;
};

export function ConvertDropZone({
  disabled,
  multiple = true,
  onFiles,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function takeFiles(list: FileList | File[] | null) {
    if (!list || disabled) return;
    const files = Array.from(list).filter(isAcceptedConvertFile);
    if (files.length) onFiles(files);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled) setOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    setOver(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    takeFiles(e.dataTransfer.files);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center transition-colors ${
        over
          ? "border-accent bg-accent-soft/60"
          : "border-border bg-surface/40 hover:border-ink-faint"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp,image/tiff,image/heic,image/heif,.heic,.heif,.tif,.tiff"
        className="sr-only"
        onChange={(e) => {
          takeFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {children}
    </div>
  );
}

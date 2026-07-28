"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/frontend/components/button-variants";
import { PLACEHOLDERS } from "./chat-phrases";

export type PendingAttachment = {
  id: string;
  name: string;
  type: "pdf" | "image";
  previewUrl?: string;
};

type Props = {
  disabled: boolean;
  streaming: boolean;
  editingContent: string | null;
  attachments: PendingAttachment[];
  onCancelEdit: () => void;
  onRemoveAttachment: (id: string) => void;
  onPickFiles: (files: File[] | FileList) => void;
  onSend: (content: string) => void;
  onStop: () => void;
};

const PASTE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/** ~8 lines at text-sm / leading-relaxed */
const MAX_TEXTAREA_PX = 176;

function extensionForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "png";
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-accent" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 1.5A1.5 1.5 0 0 1 5.5 0h4.086a1.5 1.5 0 0 1 1.06.44l2.914 2.914A1.5 1.5 0 0 1 14 4.414V14.5A1.5 1.5 0 0 1 12.5 16h-7A1.5 1.5 0 0 1 4 14.5v-13ZM5.5 1.5v13h7V5H9.5A1.5 1.5 0 0 1 8 3.5V1.5H5.5Z"
      />
    </svg>
  );
}

export function MessageInput({
  disabled,
  streaming,
  editingContent,
  attachments,
  onCancelEdit,
  onRemoveAttachment,
  onPickFiles,
  onSend,
  onStop,
}: Props) {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingContent === null) return;
    const frame = requestAnimationFrame(() => {
      setValue(editingContent);
      textareaRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [editingContent]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [value]);

  useEffect(() => {
    if (value.trim() || focused) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [value, focused]);

  const canSend = Boolean(value.trim() || attachments.length > 0);

  function submit() {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (disabled || streaming) return;

    const items = Array.from(e.clipboardData.items);
    const imageFiles: File[] = [];

    for (const item of items) {
      if (!PASTE_IMAGE_TYPES.has(item.type)) continue;
      const blob = item.getAsFile();
      if (!blob) continue;
      const ext = extensionForMime(item.type);
      const named =
        blob.name && blob.name !== "image.png"
          ? blob
          : new File([blob], `paste-${Date.now()}.${ext}`, { type: item.type });
      imageFiles.push(named);
    }

    if (imageFiles.length === 0) return;
    e.preventDefault();
    onPickFiles(imageFiles);
  }

  return (
    <div className="shrink-0 border-t border-border bg-canvas px-4 py-4 sm:px-6">
      {editingContent !== null && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-mono text-xs text-accent">editing message</p>
          <button
            type="button"
            onClick={onCancelEdit}
            className="font-mono text-xs text-ink-muted hover:text-ink"
          >
            cancel
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group relative flex max-w-[11rem] items-center gap-2 overflow-hidden rounded-sm border border-border bg-surface"
            >
              {attachment.type === "image" && attachment.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.previewUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-accent-soft">
                  <PdfIcon />
                </div>
              )}
              <div className="min-w-0 py-1.5 pr-6">
                <p className="truncate font-mono text-[11px] text-ink-muted">
                  {attachment.name}
                </p>
                <p className="font-mono text-[10px] text-ink-faint uppercase">
                  {attachment.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.id)}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-sm bg-canvas/90 font-mono text-xs text-ink-faint hover:text-ink"
                aria-label={`Remove ${attachment.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onPickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={disabled || streaming}
          onClick={() => fileRef.current?.click()}
          className={buttonClass("secondary", "shrink-0 px-3")}
          aria-label="Attach file"
        >
          +
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (streaming) return;
              submit();
            }
          }}
          rows={1}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          disabled={disabled}
          className={`max-h-[176px] min-h-[42px] flex-1 resize-none rounded-md border bg-surface px-3 py-2.5 text-sm text-ink transition-[border-color,box-shadow] placeholder:text-ink-faint ${
            focused
              ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]"
              : "border-border"
          }`}
        />
        {streaming ? (
          <button type="button" onClick={onStop} className={buttonClass("secondary", "shrink-0")}>
            Stop
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || !canSend}
            onClick={submit}
            className={`inline-flex shrink-0 items-center justify-center rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
              canSend
                ? "bg-accent text-canvas hover:bg-accent-strong"
                : "cursor-not-allowed bg-surface-hover text-ink-faint"
            }`}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}

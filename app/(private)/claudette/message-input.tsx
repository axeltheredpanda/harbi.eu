"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/frontend/components/button-variants";

export type PendingAttachment = {
  id: string;
  name: string;
  type: "pdf" | "image";
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

function extensionForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "png";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingContent !== null) {
      setValue(editingContent);
      textareaRef.current?.focus();
    }
  }, [editingContent]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    onSend(trimmed);
    setValue("");
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
    <div className="border-t border-border bg-canvas px-4 py-4 sm:px-6">
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
              className="flex max-w-[12rem] items-center gap-2 border border-border bg-surface px-2 py-1.5"
            >
              <span className="truncate font-mono text-[11px] text-ink-muted">
                {attachment.type} · {attachment.name}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.id)}
                className="font-mono text-xs text-ink-faint hover:text-ink"
                aria-label="Remove attachment"
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (streaming) return;
              submit();
            }
          }}
          rows={1}
          placeholder="Message Claudette… (Ctrl+V for images)"
          disabled={disabled}
          className="max-h-[200px] min-h-[42px] flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
        />
        {streaming ? (
          <button type="button" onClick={onStop} className={buttonClass("secondary", "shrink-0")}>
            Stop
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || (!value.trim() && attachments.length === 0)}
            onClick={submit}
            className={buttonClass("primary", "shrink-0")}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}

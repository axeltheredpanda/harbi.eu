"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment, MessageWithAttachments } from "@/backend/supabase/types";
import { MarkdownMessage } from "./markdown-message";

export type ChatMessage = MessageWithAttachments & {
  pending?: boolean;
  streaming?: boolean;
};

type Props = {
  messages: ChatMessage[];
  onEdit: (message: ChatMessage) => void;
  streaming: boolean;
};

function AttachmentChips({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {attachments.map((attachment) => (
        <span
          key={attachment.id}
          className="font-mono text-[11px] tracking-wide text-ink-faint uppercase"
        >
          {attachment.type === "pdf" ? "pdf" : "img"} ·{" "}
          {attachment.storage_path.split("/").pop()}
        </span>
      ))}
    </div>
  );
}

export function MessageList({ messages, onEdit, streaming }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !stickToBottom) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, stickToBottom, streaming]);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distance < 80);
  }

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-6"
    >
      {messages.length === 0 && !streaming && (
        <p className="font-mono text-sm text-ink-faint">Ask Claudette anything.</p>
      )}

      {messages.map((message) => {
        const isUser = message.role === "user";
        const displayContent =
          message.content ||
          (message.pending || message.streaming ? "…" : "");

        return (
          <div
            key={message.id}
            className={`group flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
          >
            <span className="font-mono text-[11px] tracking-wider text-ink-faint uppercase">
              {isUser ? "you" : "claudette"}
              {message.streaming ? " · …" : ""}
            </span>
            <div
              className={`max-w-[min(100%,42rem)] px-3 py-2 ${
                isUser
                  ? "rounded-md bg-surface text-ink"
                  : "rounded-md border border-border/60 bg-transparent"
              }`}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {displayContent}
                </p>
              ) : (
                <MarkdownMessage content={displayContent} />
              )}
              <AttachmentChips attachments={message.attachments} />
            </div>
            {isUser && !message.pending && !streaming && (
              <button
                type="button"
                onClick={() => onEdit(message)}
                className="font-mono text-[11px] text-ink-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
              >
                edit
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

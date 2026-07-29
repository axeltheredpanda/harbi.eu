"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment, MessageWithAttachments } from "@/backend/supabase/types";
import { formatQuietCostUsd } from "@/frontend/chat/format-cost";
import { MarkdownMessage, ThinkingIndicator } from "./markdown-message";
import { SUGGESTED_PROMPTS } from "./chat-phrases";

export type ChatMessage = MessageWithAttachments & {
  pending?: boolean;
  streaming?: boolean;
  error?: boolean;
  costUsd?: number | null;
  copySegments?: { label: string; text: string }[];
  copySegmentsLoading?: boolean;
};

export type ThreadError = {
  message: string;
  onRetry: () => void;
} | null;

type Props = {
  messages: ChatMessage[];
  streaming: boolean;
  threadError: ThreadError;
  onEdit: (message: ChatMessage) => void;
  onRegenerate: (message: ChatMessage) => void;
  onCopy: (text: string) => void;
  onSuggestedPrompt: (prompt: string) => void;
};

function attachmentLabel(attachment: Attachment) {
  const name = attachment.storage_path.split("/").pop() ?? attachment.storage_path;
  return attachment.type === "pdf" ? `PDF · ${name}` : `Image · ${name}`;
}

function AttachmentChips({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {attachments.map((attachment) => (
        <span
          key={attachment.id}
          className="rounded-sm border border-border bg-surface px-2 py-1 font-mono text-[11px] text-ink-faint"
        >
          {attachmentLabel(attachment)}
        </span>
      ))}
    </div>
  );
}

function CopyButton({ text, onCopy }: { text: string; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        onCopy(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="font-mono text-[11px] text-ink-faint opacity-0 transition-opacity duration-150 hover:text-ink group-hover:opacity-100"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function MessageList({
  messages,
  streaming,
  threadError,
  onEdit,
  onRegenerate,
  onCopy,
  onSuggestedPrompt,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !stickToBottom) {
      setShowJump(!stickToBottom && (streaming || messages.some((m) => m.streaming)));
      return;
    }
    // Instant during stream so tokens don't lag behind; smooth only feels good off-stream
    el.scrollTo({
      top: el.scrollHeight,
      behavior: streaming ? "auto" : "smooth",
    });
    setShowJump(false);
  }, [messages, stickToBottom, streaming, threadError]);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < 80;
    setStickToBottom(atBottom);
    if (!atBottom) setShowJump(true);
    else setShowJump(false);
  }

  function jumpToLatest() {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setStickToBottom(true);
    setShowJump(false);
  }

  const empty = messages.length === 0 && !streaming && !threadError;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="absolute inset-0 flex flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-6"
      >
        {empty && (
          <div className="animate-chat-enter mx-auto flex max-w-lg flex-col gap-6 py-10 text-center sm:py-16">
            <div>
              <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
                Claudette
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Nouveau fil - il n’apparaît dans la sidebar qu’après le premier
                message.
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-left">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => onSuggestedPrompt(prompt)}
                    className="w-full rounded-sm border border-border bg-surface px-4 py-3 text-left text-sm text-ink-muted transition-[color,background-color,border-color] duration-150 hover:border-accent/40 hover:bg-accent-soft hover:text-ink"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";
          const thinking = Boolean(message.streaming && !message.content);
          const actionsDisabled = streaming || Boolean(message.pending);
          const costLabel = formatQuietCostUsd(message.costUsd);

          return (
            <div
              key={message.id}
              className={`group flex flex-col gap-1.5 ${
                message.pending || message.streaming ? "animate-chat-enter" : ""
              } ${isUser ? "items-end" : "items-start"}`}
            >
              <span className="font-mono text-[11px] tracking-wider text-ink-faint uppercase">
                {isUser ? "you" : "claudette"}
              </span>
              <div
                className={`max-w-[min(100%,42rem)] px-3.5 py-2.5 transition-colors duration-150 ${
                  isUser
                    ? "rounded-md bg-surface text-ink"
                    : "rounded-md border border-border/70 bg-transparent"
                }`}
              >
                {thinking ? (
                  <ThinkingIndicator />
                ) : isUser ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {message.content || (message.attachments.length ? "" : "…")}
                  </p>
                ) : (
                  <MarkdownMessage
                    content={message.content}
                    streaming={Boolean(message.streaming)}
                    copySegments={
                      message.copySegmentsLoading
                        ? undefined
                        : message.copySegments
                    }
                    onCopySegment={onCopy}
                  />
                )}
                <AttachmentChips attachments={message.attachments} />
              </div>
              {!actionsDisabled && (
                <div className="flex max-w-[min(100%,42rem)] flex-wrap items-center gap-x-3 gap-y-1">
                  <CopyButton text={message.content} onCopy={onCopy} />
                  {isUser ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(message)}
                        className="font-mono text-[11px] text-ink-faint opacity-0 transition-opacity duration-150 hover:text-ink group-hover:opacity-100"
                      >
                        edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onRegenerate(message)}
                        className="font-mono text-[11px] text-ink-faint opacity-0 transition-opacity duration-150 hover:text-ink group-hover:opacity-100"
                      >
                        regenerate
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRegenerate(message)}
                      className="font-mono text-[11px] text-ink-faint opacity-0 transition-opacity duration-150 hover:text-ink group-hover:opacity-100"
                    >
                      regenerate
                    </button>
                  )}
                  {!isUser && costLabel ? (
                    <span
                      className="font-mono text-[10px] tabular-nums text-ink-faint/80"
                      title="Estimated turn cost (approx.)"
                    >
                      {costLabel}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        {threadError && (
          <div className="animate-chat-enter mx-auto w-full max-w-lg rounded-md border border-border bg-accent-soft/60 px-4 py-3">
            <p className="font-display text-sm text-ink">{threadError.message}</p>
            <button
              type="button"
              onClick={threadError.onRetry}
              className="mt-2 font-mono text-xs text-accent transition-colors duration-150 hover:text-accent-strong"
            >
              retry
            </button>
          </div>
        )}
      </div>

      {showJump && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="animate-chat-pop absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-canvas px-3 py-1.5 font-mono text-xs text-accent shadow-sm transition-colors duration-150 hover:bg-accent-soft"
        >
          ↓ new message
        </button>
      )}
    </div>
  );
}

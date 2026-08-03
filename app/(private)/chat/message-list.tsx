"use client";

import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import type { Attachment } from "@/backend/supabase/types";
import type { BranchedMessage } from "@/backend/chat/branches";
import { formatQuietCostUsd } from "@/frontend/chat/format-cost";
import { EASE_SPRING, MOTION } from "@/frontend/motion/easing";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";
import { MarkdownMessage, ThinkingIndicator } from "./markdown-message";
import { SUGGESTED_PROMPTS } from "./chat-phrases";
import { BranchNav } from "./branch-nav";
import { CopyIconButton } from "./copy-icon-button";
import { QuickActions } from "./quick-actions";
import { ErrorFlinch } from "./error-flinch";

export type ChatMessage = BranchedMessage & {
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

type CanvasPayload = {
  title: string;
  content: string;
};

type Props = {
  messages: ChatMessage[];
  streaming: boolean;
  loading?: boolean;
  threadError: ThreadError;
  switchDirection?: "left" | "right" | null;
  onEdit: (message: ChatMessage) => void;
  onRegenerate: (message: ChatMessage) => void;
  onCopy: (text: string) => void;
  onSuggestedPrompt: (prompt: string) => void;
  onBranchNav: (message: ChatMessage, siblingId: string) => void;
  onSummarize: (message: ChatMessage) => void;
  onSaveAsNote: (message: ChatMessage) => void;
  onOpenCanvas: (payload: CanvasPayload) => void;
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

function HoverActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex max-w-[min(100%,42rem)] flex-wrap items-center gap-x-3 gap-y-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
    >
      {children}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Loading conversation"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex flex-col gap-2 ${i % 2 === 0 ? "items-end" : "items-start"}`}
        >
          <div className="skeleton-line h-2.5 w-14 rounded-sm" />
          <div
            className={`skeleton-block rounded-md ${
              i % 2 === 0 ? "h-14 w-[min(100%,18rem)]" : "h-20 w-[min(100%,28rem)]"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

function longContentCandidate(content: string): boolean {
  if (content.length > 1800) return true;
  const fence = content.match(/```[\s\S]*?```/g);
  if (!fence) return false;
  return fence.some((block) => block.split("\n").length > 18);
}

export function MessageList({
  messages,
  streaming,
  loading = false,
  threadError,
  switchDirection = null,
  onEdit,
  onRegenerate,
  onCopy,
  onSuggestedPrompt,
  onBranchNav,
  onSummarize,
  onSaveAsNote,
  onOpenCanvas,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);
  const jumpRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !stickToBottom) {
      setShowJump(!stickToBottom && (streaming || messages.some((m) => m.streaming)));
      return;
    }
    el.scrollTo({
      top: el.scrollHeight,
      behavior: streaming ? "auto" : "smooth",
    });
    setShowJump(false);
  }, [messages, stickToBottom, streaming, threadError]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el || !switchDirection || prefersReducedMotion()) return;
    anime.remove(el);
    anime.set(el, {
      opacity: 0.001,
      translateX: switchDirection === "left" ? -8 : 8,
    });
    anime({
      targets: el,
      opacity: 1,
      translateX: 0,
      duration: MOTION.settle.duration,
      easing: MOTION.settle.easing,
    });
  }, [switchDirection, messages]);

  useEffect(() => {
    const btn = jumpRef.current;
    if (!btn || !showJump || prefersReducedMotion()) return;
    anime.remove(btn);
    anime.set(btn, { opacity: 0, scale: 0.86 });
    anime({
      targets: btn,
      opacity: 1,
      scale: 1,
      duration: MOTION.spring.duration,
      easing: EASE_SPRING,
    });
  }, [showJump]);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < 80;
    setStickToBottom(atBottom);
    setShowJump(!atBottom);
  }

  function jumpToLatest() {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setStickToBottom(true);
    setShowJump(false);
  }

  const empty = messages.length === 0 && !streaming && !threadError && !loading;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="absolute inset-0 flex flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-6"
      >
        {loading && messages.length === 0 ? (
          <ThreadSkeleton />
        ) : (
        <div ref={threadRef} className="flex flex-col gap-5">
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
            const showCanvas = !isUser && longContentCandidate(message.content);

            return (
              <div
                key={message.id}
                className={`group flex flex-col gap-1.5 ${
                  message.pending || message.streaming ? "animate-chat-enter" : ""
                } ${isUser ? "items-end" : "items-start"}`}
              >
                <div className="flex max-w-[min(100%,42rem)] items-center gap-2">
                  <span className="font-mono text-[11px] tracking-wider text-ink-faint uppercase">
                    {isUser ? "you" : "claudette"}
                  </span>
                  <BranchNav
                    index={message.branchIndex}
                    count={message.branchCount}
                    disabled={actionsDisabled}
                    onPrev={() => {
                      const prev = message.siblingIds[message.branchIndex - 1];
                      if (prev) onBranchNav(message, prev);
                    }}
                    onNext={() => {
                      const next = message.siblingIds[message.branchIndex + 1];
                      if (next) onBranchNav(message, next);
                    }}
                  />
                </div>
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
                      onOpenCanvas={
                        showCanvas
                          ? (block) =>
                              onOpenCanvas({
                                title: block.title || "Canvas",
                                content: block.content,
                              })
                          : undefined
                      }
                    />
                  )}
                  <AttachmentChips attachments={message.attachments} />
                </div>
                {!actionsDisabled && (
                  <HoverActions>
                    <CopyIconButton text={message.content} onCopy={onCopy} />
                    {isUser ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(message)}
                          className="font-mono text-[11px] text-ink-faint hover:text-ink"
                        >
                          edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onRegenerate(message)}
                          className="font-mono text-[11px] text-ink-faint hover:text-ink"
                        >
                          regenerate
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRegenerate(message)}
                        className="font-mono text-[11px] text-ink-faint hover:text-ink"
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
                    {!isUser && !message.streaming ? (
                      <QuickActions
                        disabled={streaming}
                        onSummarize={() => onSummarize(message)}
                        onSaveAsNote={() => onSaveAsNote(message)}
                        onOpenCanvas={
                          showCanvas
                            ? () =>
                                onOpenCanvas({
                                  title: message.content.slice(0, 48) || "Canvas",
                                  content: message.content,
                                })
                            : undefined
                        }
                      />
                    ) : null}
                  </HoverActions>
                )}
              </div>
            );
          })}

          {threadError && (
            <ErrorFlinch>
              <div className="mx-auto w-full max-w-lg rounded-md border border-border bg-accent-soft/60 px-4 py-3">
                <p className="font-display text-sm text-ink">{threadError.message}</p>
                <button
                  type="button"
                  onClick={threadError.onRetry}
                  className="mt-2 font-mono text-xs text-accent transition-colors duration-150 hover:text-accent-strong"
                >
                  retry
                </button>
              </div>
            </ErrorFlinch>
          )}
        </div>
        )}
      </div>

      {showJump && (
        <button
          ref={jumpRef}
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-canvas px-3 py-1.5 font-mono text-xs text-accent shadow-sm transition-colors duration-150 hover:bg-accent-soft"
        >
          ↓ new message
        </button>
      )}
    </div>
  );
}

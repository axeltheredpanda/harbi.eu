"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  splitContentByCopySegments,
  type CopySegmentInput,
} from "@/frontend/chat/split-copy-segments";
import { THINKING_PHRASES } from "./chat-phrases";

type CanvasBlock = { title: string; content: string };

type Props = {
  content: string;
  streaming?: boolean;
  copySegments?: CopySegmentInput[];
  onCopySegment?: (text: string) => void;
  onOpenCanvas?: (block: CanvasBlock) => void;
};

/** Split at an unclosed fenced code block so partial highlighting doesn't flash. */
function splitForStreaming(content: string): { closed: string; open: string | null } {
  const fenceMatches = [...content.matchAll(/^```/gm)];
  if (fenceMatches.length % 2 === 0) {
    return { closed: content, open: null };
  }
  const last = fenceMatches[fenceMatches.length - 1];
  const index = last.index ?? 0;
  return {
    closed: content.slice(0, index),
    open: content.slice(index),
  };
}

function MarkdownChunk({
  content,
  onOpenCanvas,
}: {
  content: string;
  onOpenCanvas?: (block: CanvasBlock) => void;
}) {
  if (!content) return null;

  const components: Components = {
    pre({ children, ...props }) {
      const child = Array.isArray(children) ? children[0] : children;
      let codeText = "";
      let language = "code";
      if (
        child &&
        typeof child === "object" &&
        "props" in child &&
        child.props
      ) {
        const className = String(
          (child.props as { className?: string }).className ?? "",
        );
        const match = /language-([\w-]+)/.exec(className);
        if (match) language = match[1] ?? "code";
        const raw = (child.props as { children?: unknown }).children;
        codeText = String(Array.isArray(raw) ? raw.join("") : (raw ?? ""));
      }

      const long = codeText.split("\n").length > 14 || codeText.length > 900;

      return (
        <div className="group/code relative">
          {long && onOpenCanvas ? (
            <button
              type="button"
              onClick={() =>
                onOpenCanvas({
                  title: language,
                  content: codeText,
                })
              }
              className="absolute top-1.5 right-1.5 z-10 rounded-sm bg-canvas/90 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-ink-faint opacity-0 shadow-sm ring-1 ring-border/60 transition-[opacity,color] duration-150 hover:text-accent focus-visible:opacity-100 group-hover/code:opacity-100"
            >
              canvas
            </button>
          ) : null}
          <pre {...props}>{children}</pre>
        </div>
      );
    },
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}

function CopyableRegion({
  label,
  text,
  content,
  onCopy,
  onOpenCanvas,
}: {
  label: string;
  text: string;
  content: string;
  onCopy: (text: string) => void;
  onOpenCanvas?: (block: CanvasBlock) => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopy(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group/seg relative my-1 rounded-sm transition-colors duration-150 hover:bg-accent-soft/45">
      <button
        type="button"
        onClick={handleCopy}
        title={`Copy · ${label}`}
        aria-label={`Copy ${label}`}
        className="absolute top-1 right-1 z-10 rounded-sm bg-canvas/90 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-ink-faint opacity-0 shadow-sm ring-1 ring-border/60 transition-[opacity,color] duration-150 hover:text-accent focus-visible:opacity-100 focus-visible:outline-none group-hover/seg:opacity-100 [@media(hover:none)]:opacity-50"
      >
        {copied ? "copied" : "copy"}
      </button>
      <div className="pr-12">
        <MarkdownChunk content={content} onOpenCanvas={onOpenCanvas} />
      </div>
    </div>
  );
}

export function MarkdownMessage({
  content,
  streaming = false,
  copySegments = [],
  onCopySegment,
  onOpenCanvas,
}: Props) {
  const { closed, open } = useMemo(() => {
    if (streaming) return splitForStreaming(content);
    return { closed: content, open: null as string | null };
  }, [content, streaming]);

  const parts = useMemo(() => {
    if (streaming || !onCopySegment || copySegments.length === 0) {
      return closed ? ([{ kind: "md" as const, content: closed }] as const) : [];
    }
    return splitContentByCopySegments(closed, copySegments);
  }, [closed, copySegments, onCopySegment, streaming]);

  return (
    <div
      className={`markdown-body max-w-none text-sm leading-relaxed text-ink ${
        streaming ? "chat-stream-ink" : ""
      }`}
    >
      {parts.map((part, index) => {
        if (part.kind === "segment" && onCopySegment) {
          return (
            <CopyableRegion
              key={`seg-${index}-${part.label}`}
              label={part.label}
              text={part.text}
              content={part.content}
              onCopy={onCopySegment}
              onOpenCanvas={onOpenCanvas}
            />
          );
        }
        return (
          <MarkdownChunk
            key={`md-${index}`}
            content={part.content}
            onOpenCanvas={onOpenCanvas}
          />
        );
      })}
      {open ? (
        <pre className="!mt-2 whitespace-pre-wrap">
          <code>{open.replace(/^```\w*\n?/, "")}</code>
        </pre>
      ) : null}
      {streaming ? (
        <span className="streaming-cursor" aria-hidden="true" />
      ) : null}
    </div>
  );
}

export function ThinkingIndicator() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let fadeTimer: number | undefined;
    const id = window.setInterval(() => {
      setVisible(false);
      fadeTimer = window.setTimeout(() => {
        setIndex((i) => (i + 1) % THINKING_PHRASES.length);
        setVisible(true);
      }, 140);
    }, 2000);
    return () => {
      window.clearInterval(id);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <p
      className={`chat-crossfade font-display text-sm italic text-ink-muted ${
        visible ? "chat-crossfade-in" : "chat-crossfade-out"
      }`}
    >
      {THINKING_PHRASES[index]}
      <span className="streaming-cursor ml-0.5" aria-hidden="true" />
    </p>
  );
}

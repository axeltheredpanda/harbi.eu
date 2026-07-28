"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { THINKING_PHRASES } from "./chat-phrases";

type Props = {
  content: string;
  streaming?: boolean;
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

export function MarkdownMessage({ content, streaming = false }: Props) {
  const { closed, open } = useMemo(() => {
    if (!streaming) return { closed: content, open: null as string | null };
    return splitForStreaming(content);
  }, [content, streaming]);

  return (
    <div className="markdown-body max-w-none text-sm leading-relaxed text-ink">
      {closed ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {closed}
        </ReactMarkdown>
      ) : null}
      {open ? (
        <pre className="!mt-2 whitespace-pre-wrap">
          <code>{open.replace(/^```\w*\n?/, "")}</code>
        </pre>
      ) : null}
      {streaming ? <span className="streaming-cursor" aria-hidden="true" /> : null}
    </div>
  );
}

export function ThinkingIndicator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % THINKING_PHRASES.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p
      key={index}
      className="animate-rise font-display text-sm italic text-ink-muted"
    >
      {THINKING_PHRASES[index]}
      <span className="streaming-cursor ml-0.5" aria-hidden="true" />
    </p>
  );
}

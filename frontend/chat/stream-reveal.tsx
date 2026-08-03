"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EASE_SETTLE, MOTION } from "@/frontend/motion/easing";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";
import { animate, anime } from "@/frontend/chat/use-anime";

type Props = {
  text: string;
  active: boolean;
  className?: string;
};

type Token = {
  text: string;
  kind: "space" | "word" | "punctuation";
};

function tokenize(text: string): Token[] {
  const matches = text.match(/\s+|[A-Za-z0-9_'’-]+|[^A-Za-z0-9\s]/g) ?? [];
  return matches.map((part) => {
    if (/^\s+$/.test(part)) return { text: part, kind: "space" };
    if (/^[.,;:!?()[\]{}"“”‘’`-]+$/.test(part)) {
      return { text: part, kind: "punctuation" };
    }
    return { text: part, kind: "word" };
  });
}

function delayForToken(token: Token, previous: Token | undefined) {
  const sentencePause =
    previous?.kind === "punctuation" && /[.!?]/.test(previous.text) ? 85 : 0;
  if (token.kind === "space") return 6 + sentencePause;
  if (token.kind === "punctuation") return 12 + sentencePause;
  return Math.min(46, 18 + token.text.length * 2) + sentencePause;
}

export function StreamReveal({ text, active, className }: Props) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const [visibleCount, setVisibleCount] = useState(active ? 0 : tokens.length);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tokenRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const animatedThrough = useRef(0);
  const wasActive = useRef(active);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setReducedMotion(prefersReducedMotion());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (active && !wasActive.current && !reducedMotion) {
      const frame = window.requestAnimationFrame(() => {
        animatedThrough.current = 0;
        setVisibleCount(0);
      });
      wasActive.current = active;
      return () => window.cancelAnimationFrame(frame);
    }
    wasActive.current = active;
  }, [active, reducedMotion]);

  useEffect(() => {
    if (!active || reducedMotion || visibleCount >= tokens.length) return;
    const id = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(tokens.length, count + 1));
    }, delayForToken(tokens[visibleCount], tokens[visibleCount - 1]));
    return () => window.clearTimeout(id);
  }, [active, reducedMotion, tokens, visibleCount]);

  useEffect(() => {
    if (!active || reducedMotion) return;
    if (visibleCount <= animatedThrough.current) return;

    const nodes = tokenRefs.current.slice(animatedThrough.current, visibleCount);
    animatedThrough.current = visibleCount;
    const targets = nodes.filter((node): node is HTMLSpanElement => Boolean(node));
    if (!targets.length) return;

    anime.set(targets, { opacity: 0.001, translateY: 3 });
    animate({
      targets,
      opacity: [0.001, 1],
      translateY: [3, 0],
      duration: 180,
      easing: EASE_SETTLE,
    });
  }, [active, reducedMotion, visibleCount]);

  if (reducedMotion) {
    return (
      <span className={className}>
        {text}
        {active ? (
          <span
            className="streaming-cursor"
            style={{ animation: "none", opacity: 0.7 }}
            aria-hidden="true"
          />
        ) : null}
      </span>
    );
  }

  return (
    <span className={`whitespace-pre-wrap ${className ?? ""}`}>
      {tokens.slice(0, active ? Math.min(visibleCount, tokens.length) : tokens.length).map((token, index) => (
        <span
          key={`${index}-${token.text}`}
          ref={(node) => {
            tokenRefs.current[index] = node;
          }}
          className="stream-reveal-token inline"
        >
          {token.text}
        </span>
      ))}
      {active ? (
        <span
          className="streaming-cursor stream-reveal-cursor"
          style={{ animationDuration: `${MOTION.cursorPulseMs}ms` }}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}

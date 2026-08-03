"use client";

import { useEffect, useRef, useState } from "react";
import { EASE_SPRING, MOTION } from "@/frontend/motion/easing";
import { prefersReducedMotion } from "@/frontend/motion/prefers-reduced";
import { animate, anime, type AnimeInstance } from "@/frontend/chat/use-anime";

type Props = {
  disabled: boolean;
  onTranscript: (text: string, isFinal: boolean) => void;
};

type SpeechAlternative = {
  transcript: string;
};

type SpeechResult = {
  isFinal: boolean;
  0?: SpeechAlternative;
};

type SpeechResultList = {
  length: number;
  [index: number]: SpeechResult;
};

type SpeechEvent = Event & {
  resultIndex: number;
  results: SpeechResultList;
};

type BrowserSpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function speechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function VoiceDictateButton({ disabled, onTranscript }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const pulseRef = useRef<AnimeInstance | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSupported(Boolean(speechRecognitionConstructor()));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !listening || prefersReducedMotion()) return;

    anime.remove(button);
    pulseRef.current = animate({
      targets: button,
      scale: [1, 1.04],
      boxShadow: [
        "0 0 0 0 rgba(154, 78, 44, 0)",
        "0 0 0 5px rgba(154, 78, 44, 0.12)",
      ],
      duration: MOTION.spring.duration,
      easing: EASE_SPRING,
      direction: "alternate",
      loop: true,
    });

    return () => {
      pulseRef.current?.pause();
      anime.remove(button);
      button.style.transform = "";
      button.style.boxShadow = "";
    };
  }, [listening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      pulseRef.current?.pause();
    };
  }, []);

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function start() {
    const Recognition = speechRecognitionConstructor();
    if (!Recognition || disabled) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? "";
        if (!transcript) continue;
        if (result.isFinal) finalText += transcript;
        else interim += transcript;
      }

      if (interim) onTranscript(interim, false);
      if (finalText) onTranscript(finalText, true);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onClick={() => {
        if (listening) stop();
        else start();
      }}
      aria-pressed={listening}
      aria-label={listening ? "Stop dictation" : "Dictate message"}
      title={listening ? "Listening" : "Dictate"}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border font-mono text-xs transition-[background-color,border-color,color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-40 ${
        listening
          ? "bg-accent-soft text-accent"
          : "bg-transparent text-ink-faint hover:bg-surface-hover hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-[1.125rem] w-[1.125rem]" aria-hidden="true">
        <path
          d="M12 4.5a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0v-4a3 3 0 0 0-3-3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M6.5 10.5v1a5.5 5.5 0 0 0 11 0v-1M12 17v2.5M9.5 19.5h5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
      <span className="sr-only">{listening ? "listening" : "dictate"}</span>
    </button>
  );
}

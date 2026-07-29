"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type NewsUiContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openNews: () => void;
  closeNews: () => void;
};

const NewsUiContext = createContext<NewsUiContextValue | null>(null);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openNews = useCallback(() => setOpen(true), []);
  const closeNews = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("harbi:news-open", onOpen);
    return () => window.removeEventListener("harbi:news-open", onOpen);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("news") === "1" || window.location.hash === "#news") {
      setOpen(true);
    }
  }, []);

  // Windows-first: Ctrl+Shift+Y opens News (Ctrl+N / Ctrl+Shift+N conflict with browser)
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.toLowerCase() === "y"
      ) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target?.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, openNews, closeNews }),
    [open, openNews, closeNews],
  );

  return (
    <NewsUiContext.Provider value={value}>{children}</NewsUiContext.Provider>
  );
}

export function useNewsUi() {
  const ctx = useContext(NewsUiContext);
  if (!ctx) {
    throw new Error("useNewsUi must be used within NewsProvider");
  }
  return ctx;
}

export function openNewsDrawer() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("harbi:news-open"));
  }
}

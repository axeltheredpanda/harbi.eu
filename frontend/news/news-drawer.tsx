"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buttonClass } from "@/frontend/components/button-variants";
import { relativeShort } from "@/frontend/news/relative-time";
import { sanitizeFeedHtml } from "@/frontend/news/sanitize-html";
import {
  loadLocalReadIds,
  saveLocalReadIds,
} from "@/frontend/news/read-storage";
import { useNewsUi } from "@/frontend/news/news-provider";

type Feed = {
  id: string;
  name: string;
  favicon_url: string | null;
  status: "ok" | "unreachable";
  consecutive_failures: number;
  last_fetched_at: string | null;
};

type Item = {
  id: string;
  feed_id: string;
  title: string;
  url: string;
  published_at: string | null;
  content_snippet: string | null;
  full_content: string | null;
  read_at: string | null;
  feed: {
    id: string;
    name: string;
    favicon_url: string | null;
    status: "ok" | "unreachable";
    consecutive_failures: number;
  };
};

type ViewMode = "chrono" | "grouped";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function NewsDrawer() {
  const { open, setOpen, closeNews } = useNewsUi();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [enabledFeeds, setEnabledFeeds] = useState<Set<string> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chrono");
  const [localRead, setLocalRead] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const scrollPreserveRef = useRef<number | null>(null);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    try {
      const res = await fetch("/api/news/items");
      const data = (await res.json()) as {
        feeds?: Feed[];
        items?: Item[];
        lastSyncedAt?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setNote(data.error ?? "Could not load feeds");
        return;
      }
      // Preserve scroll if quietly refreshing in background
      if (opts?.quiet && listRef.current) {
        scrollPreserveRef.current = listRef.current.scrollTop;
      }
      setFeeds(data.feeds ?? []);
      setItems(data.items ?? []);
      setLastSyncedAt(data.lastSyncedAt ?? null);
      setEnabledFeeds((prev) => {
        if (prev) return prev;
        return new Set((data.feeds ?? []).map((f) => f.id));
      });
    } catch {
      setNote("Network error loading news");
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLocalRead(loadLocalReadIds());
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (scrollPreserveRef.current != null && listRef.current) {
      listRef.current.scrollTop = scrollPreserveRef.current;
      scrollPreserveRef.current = null;
    }
  }, [items]);

  const isRead = useCallback(
    (item: Item) => Boolean(item.read_at) || localRead.has(item.id),
    [localRead],
  );

  const persistRead = useCallback(
    async (ids: string[], read: boolean) => {
      setLocalRead((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if (read) next.add(id);
          else next.delete(id);
        }
        saveLocalReadIds(next);
        return next;
      });
      setItems((prev) =>
        prev.map((item) =>
          ids.includes(item.id)
            ? {
                ...item,
                read_at: read ? new Date().toISOString() : null,
              }
            : item,
        ),
      );
      try {
        await fetch("/api/news/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds: ids, read }),
        });
      } catch {
        // local state already updated
      }
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    const ids = items.map((i) => i.id);
    setLocalRead(() => {
      const next = new Set(ids);
      saveLocalReadIds(next);
      return next;
    });
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
    );
    try {
      await fetch("/api/news/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, read: true }),
      });
    } catch {
      // local ok
    }
  }, [items]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setNote(null);
    try {
      const res = await fetch("/api/news/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await res.json()) as {
        error?: string;
        inserted?: number;
        errors?: { feedId: string; message: string }[];
      };
      if (!res.ok) {
        setNote(data.error ?? "Sync failed");
        return;
      }
      const failed = data.errors?.length ?? 0;
      setNote(
        failed > 0
          ? `+${data.inserted ?? 0} new · ${failed} feed issue${failed > 1 ? "s" : ""}`
          : `+${data.inserted ?? 0} new`,
      );
      await load({ quiet: true });
    } catch {
      setNote("Sync network error");
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const visibleItems = useMemo(() => {
    const enabled = enabledFeeds;
    if (!enabled) return items;
    return items.filter((i) => enabled.has(i.feed_id));
  }, [items, enabledFeeds]);

  const unreadVisible = useMemo(
    () => visibleItems.filter((i) => !isRead(i)),
    [visibleItems, isRead],
  );

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return visibleItems.findIndex((i) => i.id === selectedId);
  }, [visibleItems, selectedId]);

  useEffect(() => {
    if (!open) return;
    if (visibleItems.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleItems.some((i) => i.id === selectedId)) {
      setSelectedId(visibleItems[0]!.id);
    }
  }, [open, visibleItems, selectedId]);

  const openItem = useCallback(
    (id: string) => {
      setReadingId(id);
      setSelectedId(id);
      const item = items.find((i) => i.id === id);
      if (item && !isRead(item)) {
        void persistRead([id], true);
      }
    },
    [items, isRead, persistRead],
  );

  const toggleReadSelected = useCallback(() => {
    if (!selectedId) return;
    const item = items.find((i) => i.id === selectedId);
    if (!item) return;
    void persistRead([selectedId], !isRead(item));
  }, [selectedId, items, isRead, persistRead]);

  // Keyboard shortcuts while drawer open (Windows-first: no Meta required)
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (readingId) {
          setReadingId(null);
        } else {
          closeNews();
        }
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "j") {
        event.preventDefault();
        if (selectedIndex < visibleItems.length - 1) {
          const next = visibleItems[selectedIndex + 1]!;
          setSelectedId(next.id);
          if (readingId) setReadingId(next.id);
        }
      } else if (key === "k") {
        event.preventDefault();
        if (selectedIndex > 0) {
          const prev = visibleItems[selectedIndex - 1]!;
          setSelectedId(prev.id);
          if (readingId) setReadingId(prev.id);
        }
      } else if (key === "o" || event.key === "Enter") {
        if (selectedId) {
          event.preventDefault();
          openItem(selectedId);
        }
      } else if (key === "m") {
        event.preventDefault();
        toggleReadSelected();
      } else if (key === "r" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        void sync();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    open,
    readingId,
    closeNews,
    selectedIndex,
    visibleItems,
    selectedId,
    openItem,
    toggleReadSelected,
    sync,
  ]);

  useEffect(() => {
    if (!open || !selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-news-id="${selectedId}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedId, open, readingId]);

  function toggleFeed(id: string) {
    setEnabledFeeds((prev) => {
      const base = prev ?? new Set(feeds.map((f) => f.id));
      const next = new Set(base);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const readingItem = readingId
    ? items.find((i) => i.id === readingId)
    : null;

  const grouped = useMemo(() => {
    const map = new Map<string, { feed: Feed; items: Item[]; unread: number }>();
    for (const feed of feeds) {
      if (enabledFeeds && !enabledFeeds.has(feed.id)) continue;
      map.set(feed.id, { feed, items: [], unread: 0 });
    }
    for (const item of visibleItems) {
      const g = map.get(item.feed_id);
      if (!g) continue;
      g.items.push(item);
      if (!isRead(item)) g.unread += 1;
    }
    return [...map.values()].filter((g) => g.items.length > 0);
  }, [feeds, enabledFeeds, visibleItems, isRead]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink/30"
        aria-label="Close news"
        onClick={closeNews}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="News"
        className="relative z-10 flex h-full w-full flex-col border-l border-border bg-canvas shadow-xl sm:max-w-md md:max-w-lg"
      >
        <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                Reader
              </p>
              <h2 className="font-display text-xl font-medium tracking-tight text-ink">
                News
              </h2>
            </div>
            <button
              type="button"
              className={buttonClass("ghost", "text-xs")}
              onClick={closeNews}
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {feeds.map((feed) => {
              const on = !enabledFeeds || enabledFeeds.has(feed.id);
              return (
                <button
                  key={feed.id}
                  type="button"
                  onClick={() => toggleFeed(feed.id)}
                  className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                    on
                      ? "border-accent/40 bg-accent-soft text-accent"
                      : "border-border text-ink-faint hover:text-ink-muted"
                  }`}
                >
                  {feed.favicon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={feed.favicon_url}
                      alt=""
                      width={12}
                      height={12}
                      className="size-3 opacity-80"
                    />
                  ) : null}
                  {feed.name}
                  {feed.status === "unreachable" ? (
                    <span
                      className="text-accent"
                      title="Feed unreachable after repeated failures"
                    >
                      !
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={buttonClass("secondary", "text-[11px]")}
              disabled={syncing}
              onClick={() => void sync()}
              title="Ctrl+Shift+Y opens · R refreshes"
            >
              {syncing ? "Syncing…" : "Refresh"}
            </button>
            <button
              type="button"
              className={buttonClass("ghost", "text-[11px]")}
              onClick={() => void markAllRead()}
            >
              Mark all read
            </button>
            <div className="ml-auto flex items-center gap-1 font-mono text-[10px] text-ink-faint">
              <button
                type="button"
                className={
                  viewMode === "chrono" ? "text-accent" : "hover:text-ink"
                }
                onClick={() => setViewMode("chrono")}
              >
                Feed
              </button>
              <span>·</span>
              <button
                type="button"
                className={
                  viewMode === "grouped" ? "text-accent" : "hover:text-ink"
                }
                onClick={() => setViewMode("grouped")}
              >
                By source
              </button>
            </div>
          </div>
          <p className="mt-2 font-mono text-[10px] text-ink-faint">
            {lastSyncedAt
              ? `Last synced ${relativeShort(lastSyncedAt)} ago`
              : "Not synced yet"}
            {note ? ` · ${note}` : ""}
            <span className="hidden sm:inline">
              {" "}
              · j/k · Enter · m · r · Esc · Ctrl+Shift+Y
            </span>
          </p>
        </header>

        {readingItem ? (
          <article className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <button
              type="button"
              className="font-mono text-[11px] text-ink-faint hover:text-ink"
              onClick={() => setReadingId(null)}
            >
              ← Back to list
            </button>
            <p className="mt-4 flex items-center gap-2 font-mono text-[11px] text-ink-faint">
              {readingItem.feed.favicon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={readingItem.feed.favicon_url}
                  alt=""
                  width={14}
                  height={14}
                  className="size-3.5"
                />
              ) : null}
              {readingItem.feed.name}
              {readingItem.published_at
                ? ` · ${relativeShort(readingItem.published_at)}`
                : ""}
            </p>
            <h3 className="mt-2 font-display text-2xl font-medium leading-snug tracking-tight text-ink">
              {readingItem.title}
            </h3>
            <div
              className="news-article-body mt-5 space-y-3 text-[15px] leading-relaxed text-ink-muted [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_h1]:font-display [&_h1]:text-ink [&_h2]:font-display [&_h2]:text-ink [&_h3]:font-display [&_h3]:text-ink [&_p]:mb-3"
              dangerouslySetInnerHTML={{
                __html: sanitizeFeedHtml(
                  readingItem.full_content ||
                    (readingItem.content_snippet
                      ? `<p>${readingItem.content_snippet}</p>`
                      : "<p>No cached body for this item.</p>"),
                ),
              }}
            />
            <p className="mt-8 border-t border-border pt-4">
              <a
                href={readingItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-ink-faint transition-colors hover:text-accent"
              >
                View original source →
              </a>
            </p>
          </article>
        ) : (
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-5 py-10 font-mono text-xs text-ink-faint">
                Loading shelf…
              </p>
            ) : visibleItems.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="font-display text-lg text-ink">
                  {feeds.length === 0 ? "Shelf is empty" : "You’re caught up"}
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  {feeds.length === 0
                    ? "Run the SQL migration, then hit Refresh (or wait for the scheduled sync)."
                    : "Quiet for now — flip a source back on, or hit Refresh."}
                </p>
              </div>
            ) : unreadVisible.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="font-display text-lg text-ink">You’re caught up</p>
                <p className="mt-2 text-sm text-ink-muted">
                  Everything in view is read. Refresh if the timeline moved, or
                  dig into the muted titles below.
                </p>
                <ul className="mt-6 divide-y divide-border border-t border-border text-left">
                  {visibleItems.map((item) => (
                    <NewsRow
                      key={item.id}
                      item={item}
                      read
                      selected={item.id === selectedId}
                      onSelect={() => setSelectedId(item.id)}
                      onOpen={() => openItem(item.id)}
                    />
                  ))}
                </ul>
              </div>
            ) : viewMode === "chrono" ? (
              <ul className="divide-y divide-border">
                {visibleItems.map((item) => (
                  <NewsRow
                    key={item.id}
                    item={item}
                    read={isRead(item)}
                    selected={item.id === selectedId}
                    onSelect={() => setSelectedId(item.id)}
                    onOpen={() => openItem(item.id)}
                  />
                ))}
              </ul>
            ) : (
              <div className="space-y-6 py-2">
                {grouped.map((group) => (
                  <section key={group.feed.id}>
                    <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-canvas/95 px-4 py-2 backdrop-blur-sm">
                      {group.feed.favicon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={group.feed.favicon_url}
                          alt=""
                          width={14}
                          height={14}
                          className="size-3.5"
                        />
                      ) : null}
                      <h3 className="font-mono text-[11px] uppercase tracking-wide text-ink">
                        {group.feed.name}
                      </h3>
                      {group.feed.status === "unreachable" ? (
                        <span className="font-mono text-[10px] text-accent">
                          unreachable
                        </span>
                      ) : null}
                      {group.unread > 0 ? (
                        <span className="rounded-sm bg-accent px-1.5 py-0.5 font-mono text-[10px] text-canvas">
                          {group.unread}
                        </span>
                      ) : null}
                    </div>
                    <ul className="divide-y divide-border">
                      {group.items.map((item) => (
                        <NewsRow
                          key={item.id}
                          item={item}
                          read={isRead(item)}
                          selected={item.id === selectedId}
                          onSelect={() => setSelectedId(item.id)}
                          onOpen={() => openItem(item.id)}
                          hideSource
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NewsRow({
  item,
  read,
  selected,
  onSelect,
  onOpen,
  hideSource,
}: {
  item: Item;
  read: boolean;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  hideSource?: boolean;
}) {
  return (
    <li data-news-id={item.id}>
      <button
        type="button"
        onClick={() => {
          onSelect();
          onOpen();
        }}
        onFocus={onSelect}
        className={`flex w-full gap-2.5 px-4 py-3 text-left transition-colors ${
          selected ? "bg-accent-soft/60" : "hover:bg-surface"
        }`}
      >
        <span className="mt-1.5 w-2 shrink-0">
          {!read ? (
            <span className="block size-1.5 rounded-full bg-accent" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          {!hideSource ? (
            <span
              className={`flex items-center gap-1.5 font-mono text-[10px] tracking-wide ${
                read ? "text-ink-faint" : "text-ink-muted"
              }`}
            >
              {item.feed.favicon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.feed.favicon_url}
                  alt=""
                  width={12}
                  height={12}
                  className="size-3"
                />
              ) : null}
              {item.feed.name}
              {item.feed.status === "unreachable" ? (
                <span className="text-accent">!</span>
              ) : null}
            </span>
          ) : null}
          <span
            className={`mt-0.5 block text-sm leading-snug ${
              read ? "text-ink-faint" : "font-medium text-ink"
            }`}
          >
            {item.title}
          </span>
        </span>
        <span className="shrink-0 font-mono text-[10px] text-ink-faint">
          {relativeShort(item.published_at)}
        </span>
      </button>
    </li>
  );
}

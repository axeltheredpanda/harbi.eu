"use client";

import { useMemo, useState } from "react";
import type { Conversation } from "@/backend/supabase/types";
import { buttonClass } from "@/frontend/components/button-variants";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

function ConversationList({
  conversations,
  activeId,
  query,
  onSelect,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  query: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  if (filtered.length === 0) {
    return (
      <p className="px-2 py-4 font-mono text-xs text-ink-faint">
        {query.trim() ? "No matches" : "No chats yet"}
      </p>
    );
  }

  return (
    <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
      {filtered.map((conversation) => {
        const active = conversation.id === activeId;
        return (
          <li key={conversation.id} className="group flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`min-w-0 flex-1 truncate rounded-md px-2 py-2 text-left text-sm transition-colors ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:bg-surface-hover hover:text-ink"
              }`}
            >
              {conversation.title}
            </button>
            <button
              type="button"
              onClick={() => onDelete(conversation.id)}
              className="rounded-md px-2 font-mono text-xs text-ink-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Delete conversation"
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ConversationSidebar({
  conversations,
  activeId,
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  const [query, setQuery] = useState("");

  const panel = (
    <div className="flex h-full min-h-0 w-full flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="hidden font-mono text-xs text-ink-muted hover:text-ink md:inline"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="font-mono text-xs text-ink-muted hover:text-ink md:hidden"
          aria-label="Close conversations"
        >
          close
        </button>
        <button
          type="button"
          onClick={onCreate}
          className={buttonClass("ghost", "px-2 py-1 text-xs")}
        >
          + new
        </button>
      </div>

      <div className="border-b border-border px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats…"
          className="w-full rounded-sm border border-border bg-canvas px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint"
        />
      </div>

      <ConversationList
        conversations={conversations}
        activeId={activeId}
        query={query}
        onSelect={(id) => {
          onSelect(id);
          onCloseMobile();
        }}
        onDelete={onDelete}
      />
    </div>
  );

  return (
    <>
      {/* Desktop column */}
      <aside
        className={`relative hidden shrink-0 flex-col border-r border-border transition-[width] md:flex ${
          collapsed ? "w-12" : "w-64"
        }`}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-3 py-3">
            <button
              type="button"
              onClick={onToggle}
              className="font-mono text-xs text-ink-muted hover:text-ink"
              aria-label="Expand sidebar"
            >
              »
            </button>
            <button
              type="button"
              onClick={onCreate}
              className="font-mono text-xs text-accent hover:text-accent-strong"
              title="New conversation"
            >
              +
            </button>
          </div>
        ) : (
          panel
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30"
            aria-label="Close sidebar backdrop"
            onClick={onCloseMobile}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-border shadow-lg">
            {panel}
          </aside>
        </div>
      )}
    </>
  );
}

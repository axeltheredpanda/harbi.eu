"use client";

import type { Conversation } from "@/backend/supabase/types";
import { buttonClass } from "@/frontend/components/button-variants";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

export function ConversationSidebar({
  conversations,
  activeId,
  collapsed,
  onToggle,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-border bg-surface transition-[width] ${
        collapsed ? "w-12" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="font-mono text-xs text-ink-muted hover:text-ink"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
        {!collapsed && (
          <button
            type="button"
            onClick={onCreate}
            className={buttonClass("ghost", "px-2 py-1 text-xs")}
          >
            + new
          </button>
        )}
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={onCreate}
          className="px-2 py-3 font-mono text-xs text-accent hover:text-accent-strong"
          title="New conversation"
        >
          +
        </button>
      ) : (
        <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {conversations.map((conversation) => {
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
                  className="rounded-md px-2 font-mono text-xs text-ink-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  ×
                </button>
              </li>
            );
          })}
          {conversations.length === 0 && (
            <li className="px-2 py-4 font-mono text-xs text-ink-faint">No chats yet</li>
          )}
        </ul>
      )}
    </aside>
  );
}

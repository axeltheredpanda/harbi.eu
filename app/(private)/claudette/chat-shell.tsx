"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Conversation } from "@/backend/supabase/types";
import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  listConversations,
} from "@/backend/chat/conversations";
import { ConversationSidebar } from "./conversation-sidebar";
import { MessageList, type ChatMessage } from "./message-list";
import { MessageInput, type PendingAttachment } from "./message-input";

type Props = {
  initialConversations: Conversation[];
};

function parseSseChunk(buffer: string): { events: { event: string; data: string }[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: { event: string; data: string }[] = [];

  for (const part of parts) {
    if (!part.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    events.push({ event, data: dataLines.join("\n") });
  }

  return { events, rest };
}

export function ChatShell({ initialConversations }: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const loadingConvRef = useRef<string | null>(null);

  const loadMessages = useCallback(async (conversationId: string) => {
    loadingConvRef.current = conversationId;
    const rows = await getConversationMessages(conversationId);
    if (loadingConvRef.current !== conversationId) return;
    setMessages(rows);
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    startTransition(() => {
      void loadMessages(activeId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      });
    });
  }, [activeId, loadMessages]);

  async function refreshConversations(selectId?: string) {
    const list = await listConversations();
    setConversations(list);
    if (selectId) {
      setActiveId(selectId);
    } else if (list.length && !list.some((c) => c.id === activeId)) {
      setActiveId(list[0].id);
    } else if (!list.length) {
      setActiveId(null);
    }
  }

  async function handleCreate() {
    setError(null);
    const created = await createConversation();
    setConversations((prev) => [created, ...prev]);
    setActiveId(created.id);
    setMessages([]);
    setPendingAttachments([]);
    setEditingMessageId(null);
    setEditingContent(null);
  }

  async function handleDelete(id: string) {
    setError(null);
    await deleteConversation(id);
    const next = conversations.filter((c) => c.id !== id);
    setConversations(next);
    if (activeId === id) {
      setActiveId(next[0]?.id ?? null);
      setMessages([]);
    }
  }

  async function ensureConversation(): Promise<string> {
    if (activeId) return activeId;
    const created = await createConversation();
    setConversations((prev) => [created, ...prev]);
    setActiveId(created.id);
    return created.id;
  }

  async function handlePickFiles(files: File[] | FileList) {
    setError(null);
    const conversationId = await ensureConversation();

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set("file", file);
      form.set("conversation_id", conversationId);
      const res = await fetch("/api/claude/upload", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Upload failed for ${file.name}`);
        continue;
      }
      setPendingAttachments((prev) => [
        ...prev,
        { id: body.id, name: body.name ?? file.name, type: body.type },
      ]);
    }
  }

  function handleEdit(message: ChatMessage) {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setEditingContent(null);
  }

  async function handleSend(content: string) {
    setError(null);
    const conversationId = await ensureConversation();
    const attachmentIds = pendingAttachments.map((a) => a.id);
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const streamId = `stream-${crypto.randomUUID()}`;

    const optimisticAttachments = pendingAttachments.map((a) => ({
      id: a.id,
      user_id: "",
      conversation_id: conversationId,
      message_id: optimisticId,
      type: a.type,
      storage_path: a.name,
      extracted_text: null,
      created_at: new Date().toISOString(),
    }));

    if (editingMessageId) {
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === editingMessageId);
        if (index < 0) return prev;
        const kept = prev.slice(0, index);
        return [
          ...kept,
          {
            id: editingMessageId,
            conversation_id: conversationId,
            role: "user" as const,
            content,
            created_at: prev[index].created_at,
            token_count: null,
            attachments: optimisticAttachments,
            pending: true,
          },
          {
            id: streamId,
            conversation_id: conversationId,
            role: "assistant" as const,
            content: "",
            created_at: new Date().toISOString(),
            token_count: null,
            attachments: [],
            streaming: true,
          },
        ];
      });
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          conversation_id: conversationId,
          role: "user",
          content,
          created_at: new Date().toISOString(),
          token_count: null,
          attachments: optimisticAttachments,
          pending: true,
        },
        {
          id: streamId,
          conversation_id: conversationId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          token_count: null,
          attachments: [],
          streaming: true,
        },
      ]);
    }

    setPendingAttachments([]);
    const editId = editingMessageId;
    setEditingMessageId(null);
    setEditingContent(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          conversation_id: conversationId,
          content,
          attachment_ids: attachmentIds,
          edit_message_id: editId ?? undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;

        for (const { event, data } of parsed.events) {
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(data) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (event === "user_message" && typeof payload.id === "string") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === optimisticId || (editId && m.id === editId)
                  ? { ...m, id: payload.id as string, pending: false }
                  : m,
              ),
            );
          }

          if (event === "delta" && typeof payload.text === "string") {
            const text = payload.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId ? { ...m, content: m.content + text } : m,
              ),
            );
          }

          if (event === "done") {
            const assistantId =
              typeof payload.assistant_message_id === "string"
                ? payload.assistant_message_id
                : streamId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId
                  ? {
                      ...m,
                      id: assistantId,
                      streaming: false,
                      content:
                        typeof payload.content === "string" ? payload.content : m.content,
                    }
                  : m,
              ),
            );
          }

          if (event === "error") {
            setError(typeof payload.message === "string" ? payload.message : "Stream error");
            setMessages((prev) =>
              prev
                .filter((m) => m.id !== streamId || m.content.trim().length > 0)
                .map((m) => (m.id === streamId ? { ...m, streaming: false } : m)),
            );
          }
        }
      }

      await refreshConversations(conversationId);
      await loadMessages(conversationId);
      await loadMessages(conversationId);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) => (m.id === streamId ? { ...m, streaming: false } : m)),
        );
      } else {
        setError(err instanceof Error ? err.message : "Send failed");
        // Reload from DB — user message may already be persisted even if the stream failed
        try {
          await loadMessages(conversationId);
          await refreshConversations(conversationId);
        } catch {
          setMessages((prev) =>
            prev.filter((m) => m.id !== streamId && m.id !== optimisticId),
          );
        }
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  return (
    <div className="-mx-6 -my-10 flex min-h-0 flex-1 sm:-mx-10">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onSelect={(id) => {
          if (streaming) return;
          setActiveId(id);
          setPendingAttachments([]);
          cancelEdit();
        }}
        onCreate={() => {
          void handleCreate();
        }}
        onDelete={(id) => {
          void handleDelete(id);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-sm text-accent">~/claudette</p>
            <h1 className="font-display text-lg font-medium text-ink">
              {conversations.find((c) => c.id === activeId)?.title ?? "Claudette"}
            </h1>
          </div>
          {pending && (
            <span className="font-mono text-xs text-ink-faint">loading…</span>
          )}
        </div>

        {error && (
          <p className="border-b border-border px-4 py-2 font-mono text-xs text-ink-muted sm:px-6">
            {error}
          </p>
        )}

        <MessageList messages={messages} onEdit={handleEdit} streaming={streaming} />

        <MessageInput
          disabled={streaming}
          streaming={streaming}
          editingContent={editingContent}
          attachments={pendingAttachments}
          onCancelEdit={cancelEdit}
          onRemoveAttachment={(id) =>
            setPendingAttachments((prev) => prev.filter((a) => a.id !== id))
          }
          onPickFiles={(files) => {
            void handlePickFiles(files);
          }}
          onSend={(content) => {
            void handleSend(content);
          }}
          onStop={handleStop}
        />
      </div>
    </div>
  );
}

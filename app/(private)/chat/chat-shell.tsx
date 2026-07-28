"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Conversation } from "@/backend/supabase/types";
import {
  CHAT_MODEL,
  type ChatModelId,
  resolveChatModel,
} from "@/backend/chat/constants";
import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  listConversations,
} from "@/backend/chat/conversations";
import { ConversationSidebar } from "./conversation-sidebar";
import { MessageList, type ChatMessage } from "./message-list";
import { MessageInput, type PendingAttachment } from "./message-input";
import { ModelSelect } from "./model-select";

const MODEL_STORAGE_KEY = "claudette.model";

type Props = {
  initialConversations: Conversation[];
};

type LastRequest =
  | {
      kind: "send";
      content: string;
      attachmentIds: string[];
      editMessageId: string | null;
    }
  | {
      kind: "regenerate";
      messageId: string;
    };

function parseSseChunk(buffer: string): {
  events: { event: string; data: string }[];
  rest: string;
} {
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

function friendlyError(raw: string, status?: number): string {
  const lower = raw.toLowerCase();
  if (status === 429 || lower.includes("rate") || lower.includes("overloaded")) {
    return "Rate limit — Claudette needs a short breath. Retry in a moment.";
  }
  if (status === 408 || lower.includes("timeout") || lower.includes("timed out")) {
    return "Timed out waiting for a reply. Worth another try.";
  }
  return raw || "Something went wrong sending that message.";
}

export function ChatShell({ initialConversations }: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState<ChatModelId>(() => {
    if (typeof window === "undefined") return CHAT_MODEL;
    try {
      return resolveChatModel(window.localStorage.getItem(MODEL_STORAGE_KEY));
    } catch {
      return CHAT_MODEL;
    }
  });
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<{
    message: string;
    onRetry: () => void;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const loadingConvRef = useRef<string | null>(null);
  const lastRequestRef = useRef<LastRequest | null>(null);
  const createPromiseRef = useRef<Promise<string> | null>(null);
  const uploadAbortRef = useRef(new Map<string, AbortController>());

  function isTempConversationId(id: string) {
    return id.startsWith("temp-");
  }

  const loadMessages = useCallback(async (conversationId: string) => {
    if (isTempConversationId(conversationId)) {
      setMessages([]);
      return;
    }
    loadingConvRef.current = conversationId;
    const rows = await getConversationMessages(conversationId);
    if (loadingConvRef.current !== conversationId) return;
    setMessages(rows);
  }, []);

  useEffect(() => {
    if (!activeId) {
      startTransition(() => {
        setMessages([]);
      });
      return;
    }
    if (isTempConversationId(activeId)) {
      startTransition(() => {
        setMessages([]);
      });
      return;
    }
    startTransition(() => {
      void loadMessages(activeId).catch((err: unknown) => {
        setThreadError({
          message: err instanceof Error ? err.message : "Failed to load messages",
          onRetry: () => {
            if (activeId) void loadMessages(activeId);
          },
        });
      });
    });
  }, [activeId, loadMessages]);

  function handleModelChange(next: ChatModelId) {
    setModel(next);
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }

  useEffect(() => {
    return () => {
      for (const attachment of pendingAttachments) {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      }
    };
    // Only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function clearComposer() {
    setPendingAttachments((prev) => {
      for (const a of prev) {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      }
      return [];
    });
    setEditingMessageId(null);
    setEditingContent(null);
  }

  async function handleCreate() {
    if (streaming) return;
    setThreadError(null);

    const previousId = activeId;
    const tempId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const optimistic: Conversation = {
      id: tempId,
      user_id: "",
      title: "New conversation",
      summary: null,
      summary_until_message_id: null,
      created_at: now,
      updated_at: now,
    };

    // Paint the empty chat immediately — don't wait on Supabase.
    setConversations((prev) => [optimistic, ...prev.filter((c) => c.id !== tempId)]);
    setActiveId(tempId);
    setMessages([]);
    clearComposer();
    setMobileOpen(false);

    const promise = createConversation()
      .then((created) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === tempId ? created : c)),
        );
        setActiveId((prev) => (prev === tempId ? created.id : prev));
        return created.id;
      })
      .catch((err: unknown) => {
        setConversations((prev) => prev.filter((c) => c.id !== tempId));
        setActiveId((prev) => (prev === tempId ? previousId : prev));
        setThreadError({
          message: err instanceof Error ? err.message : "Could not create chat",
          onRetry: () => void handleCreate(),
        });
        throw err;
      })
      .finally(() => {
        if (createPromiseRef.current === promise) {
          createPromiseRef.current = null;
        }
      });

    createPromiseRef.current = promise;
    try {
      await promise;
    } catch {
      // Error UI already set
    }
  }

  async function handleDelete(id: string) {
    setThreadError(null);
    const snapshot = conversations;
    const next = conversations.filter((c) => c.id !== id);
    setConversations(next);
    if (activeId === id) {
      setActiveId(next[0]?.id ?? null);
      setMessages([]);
      clearComposer();
    }

    try {
      if (!isTempConversationId(id)) {
        await deleteConversation(id);
      }
    } catch (err) {
      setConversations(snapshot);
      setThreadError({
        message: err instanceof Error ? err.message : "Could not delete chat",
        onRetry: () => void handleDelete(id),
      });
    }
  }

  async function ensureConversation(): Promise<string> {
    if (activeId && !isTempConversationId(activeId)) return activeId;
    if (createPromiseRef.current) return createPromiseRef.current;

    const tempId = activeId?.startsWith("temp-")
      ? activeId
      : `temp-${crypto.randomUUID()}`;

    if (!activeId || !isTempConversationId(activeId)) {
      const now = new Date().toISOString();
      setConversations((prev) => [
        {
          id: tempId,
          user_id: "",
          title: "New conversation",
          summary: null,
          summary_until_message_id: null,
          created_at: now,
          updated_at: now,
        },
        ...prev,
      ]);
      setActiveId(tempId);
    }

    const promise = createConversation()
      .then((created) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === tempId ? created : c)),
        );
        setActiveId((prev) => (prev === tempId ? created.id : prev));
        return created.id;
      })
      .finally(() => {
        if (createPromiseRef.current === promise) {
          createPromiseRef.current = null;
        }
      });

    createPromiseRef.current = promise;
    return promise;
  }

  async function handlePickFiles(files: File[] | FileList) {
    setThreadError(null);
    const list = Array.from(files);
    if (list.length === 0) return;

    const staged = list.map((file) => {
      const localId = `local-${crypto.randomUUID()}`;
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      return {
        localId,
        file,
        attachment: {
          id: localId,
          name: file.name,
          type: (isImage ? "image" : "pdf") as "pdf" | "image",
          previewUrl,
          uploading: true,
        } satisfies PendingAttachment,
      };
    });

    // Show previews immediately, upload in the background.
    setPendingAttachments((prev) => [...prev, ...staged.map((s) => s.attachment)]);

    let conversationId: string;
    try {
      conversationId = await ensureConversation();
    } catch (err) {
      for (const item of staged) {
        if (item.attachment.previewUrl) URL.revokeObjectURL(item.attachment.previewUrl);
      }
      setPendingAttachments((prev) =>
        prev.filter((a) => !staged.some((s) => s.localId === a.id)),
      );
      setThreadError({
        message: err instanceof Error ? err.message : "Could not prepare chat for upload",
        onRetry: () => void handlePickFiles(list),
      });
      return;
    }

    await Promise.all(
      staged.map(async ({ localId, file, attachment }) => {
        const controller = new AbortController();
        uploadAbortRef.current.set(localId, controller);

        try {
          const form = new FormData();
          form.set("file", file);
          form.set("conversation_id", conversationId);
          const res = await fetch("/api/claude/upload", {
            method: "POST",
            body: form,
            signal: controller.signal,
          });
          const body = await res.json().catch(() => null);

          if (controller.signal.aborted) return;

          if (!res.ok) {
            if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
            setPendingAttachments((prev) => prev.filter((a) => a.id !== localId));
            setThreadError({
              message: friendlyError(
                body?.error ?? `Upload failed for ${file.name}`,
                res.status,
              ),
              onRetry: () => void handlePickFiles([file]),
            });
            return;
          }

          setPendingAttachments((prev) =>
            prev.map((a) =>
              a.id === localId
                ? {
                    id: body.id as string,
                    name: (body.name as string) ?? file.name,
                    type: body.type as "pdf" | "image",
                    previewUrl: attachment.previewUrl,
                    uploading: false,
                  }
                : a,
            ),
          );
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
          setPendingAttachments((prev) => prev.filter((a) => a.id !== localId));
          setThreadError({
            message: err instanceof Error ? err.message : `Upload failed for ${file.name}`,
            onRetry: () => void handlePickFiles([file]),
          });
        } finally {
          uploadAbortRef.current.delete(localId);
        }
      }),
    );
  }

  function handleEdit(message: ChatMessage) {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    setThreadError(null);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setEditingContent(null);
  }

  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text);
  }

  async function runStream(
    conversationId: string,
    body: Record<string, unknown>,
    options: {
      optimisticUserId?: string;
      editId?: string | null;
      streamId: string;
    },
  ) {
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => null);
        throw Object.assign(
          new Error(friendlyError(errBody?.error ?? "Request failed", res.status)),
          { status: res.status },
        );
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
            const realId = payload.id;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === options.optimisticUserId ||
                (options.editId && m.id === options.editId)
                  ? { ...m, id: realId, pending: false }
                  : m,
              ),
            );
          }

          if (event === "delta" && typeof payload.text === "string") {
            const text = payload.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === options.streamId ? { ...m, content: m.content + text } : m,
              ),
            );
          }

          if (event === "title" && typeof payload.title === "string") {
            const title = payload.title;
            setConversations((prev) =>
              prev.map((c) =>
                c.id === conversationId ? { ...c, title } : c,
              ),
            );
          }

          if (event === "done") {
            const assistantId =
              typeof payload.assistant_message_id === "string"
                ? payload.assistant_message_id
                : options.streamId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === options.streamId
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
            const msg = friendlyError(
              typeof payload.message === "string" ? payload.message : "Stream error",
            );
            setThreadError({
              message: msg,
              onRetry: () => void retryLast(),
            });
            setMessages((prev) =>
              prev
                .filter((m) => m.id !== options.streamId || m.content.trim().length > 0)
                .map((m) =>
                  m.id === options.streamId ? { ...m, streaming: false } : m,
                ),
            );
          }
        }
      }

      await refreshConversations(conversationId);
      await loadMessages(conversationId);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === options.streamId ? { ...m, streaming: false } : m,
          ),
        );
      } else {
        setThreadError({
          message: err instanceof Error ? err.message : "Send failed",
          onRetry: () => void retryLast(),
        });
        try {
          await loadMessages(conversationId);
          await refreshConversations(conversationId);
        } catch {
          setMessages((prev) =>
            prev.filter(
              (m) =>
                m.id !== options.streamId &&
                m.id !== options.optimisticUserId,
            ),
          );
        }
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function handleSend(content: string) {
    setThreadError(null);
    if (pendingAttachments.some((a) => a.uploading)) return;

    const conversationId = await ensureConversation();
    const readyAttachments = pendingAttachments.filter(
      (a) => !a.uploading && !a.id.startsWith("local-"),
    );
    const attachmentIds = readyAttachments.map((a) => a.id);
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const streamId = `stream-${crypto.randomUUID()}`;

    lastRequestRef.current = {
      kind: "send",
      content,
      attachmentIds,
      editMessageId: editingMessageId,
    };

    const optimisticAttachments = readyAttachments.map((a) => ({
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

    const editId = editingMessageId;
    clearComposer();

    await runStream(
      conversationId,
      {
        conversation_id: conversationId,
        content,
        attachment_ids: attachmentIds,
        edit_message_id: editId ?? undefined,
        model,
      },
      {
        optimisticUserId: editId ? undefined : optimisticId,
        editId,
        streamId,
      },
    );
  }

  async function handleRegenerate(message: ChatMessage) {
    if (!activeId || streaming) return;
    setThreadError(null);
    const streamId = `stream-${crypto.randomUUID()}`;
    lastRequestRef.current = { kind: "regenerate", messageId: message.id };

    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === message.id);
      if (index < 0) return prev;
      if (message.role === "user") {
        const kept = prev.slice(0, index + 1);
        return [
          ...kept,
          {
            id: streamId,
            conversation_id: activeId,
            role: "assistant" as const,
            content: "",
            created_at: new Date().toISOString(),
            token_count: null,
            attachments: [],
            streaming: true,
          },
        ];
      }
      const kept = prev.slice(0, index);
      return [
        ...kept,
        {
          id: streamId,
          conversation_id: activeId,
          role: "assistant" as const,
          content: "",
          created_at: new Date().toISOString(),
          token_count: null,
          attachments: [],
          streaming: true,
        },
      ];
    });

    await runStream(
      activeId,
      {
        conversation_id: activeId,
        regenerate_message_id: message.id,
        model,
      },
      { streamId },
    );
  }

  async function retryLast() {
    const last = lastRequestRef.current;
    if (!last) return;
    setThreadError(null);
    if (last.kind === "send") {
      if (last.editMessageId) {
        setEditingMessageId(last.editMessageId);
        setEditingContent(last.content);
      }
      setPendingAttachments([]);
      await handleSend(last.content);
      return;
    }
    const message = messages.find((m) => m.id === last.messageId);
    if (message) await handleRegenerate(message);
    else if (activeId) {
      await loadMessages(activeId);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleSuggestedPrompt(prompt: string) {
    void handleSend(prompt);
  }

  const activeTitle =
    conversations.find((c) => c.id === activeId)?.title ?? "Claudette";

  return (
    <div className="-mx-6 -my-10 flex h-[calc(100dvh-4.25rem)] min-h-0 flex-1 sm:-mx-10">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed((v) => !v)}
        onCloseMobile={() => setMobileOpen(false)}
        onSelect={(id) => {
          if (streaming) return;
          setActiveId(id);
          setMessages([]);
          clearComposer();
          setThreadError(null);
        }}
        onCreate={() => {
          void handleCreate();
        }}
        onDelete={(id) => {
          void handleDelete(id);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="font-mono text-xs text-ink-muted hover:text-ink md:hidden"
              aria-label="Open conversations"
            >
              chats
            </button>
            <div className="min-w-0">
              <p className="font-mono text-sm text-accent">~/claudette</p>
              <h1 className="truncate font-display text-lg font-medium text-ink">
                {activeTitle}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ModelSelect
              value={model}
              disabled={streaming}
              onChange={handleModelChange}
            />
            {pending && (
              <span className="font-mono text-xs text-ink-faint">loading…</span>
            )}
          </div>
        </div>

        <MessageList
          messages={messages}
          streaming={streaming}
          threadError={threadError}
          onEdit={handleEdit}
          onRegenerate={(message) => {
            void handleRegenerate(message);
          }}
          onCopy={handleCopy}
          onSuggestedPrompt={handleSuggestedPrompt}
        />

        <MessageInput
          disabled={streaming}
          streaming={streaming}
          editingContent={editingContent}
          attachments={pendingAttachments}
          onCancelEdit={cancelEdit}
          onRemoveAttachment={(id) => {
            const controller = uploadAbortRef.current.get(id);
            controller?.abort();
            uploadAbortRef.current.delete(id);
            setPendingAttachments((prev) => {
              const target = prev.find((a) => a.id === id);
              if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
              return prev.filter((a) => a.id !== id);
            });
          }}
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

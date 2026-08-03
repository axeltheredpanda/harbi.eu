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
  getConversationUsageTotals,
  listConversations,
  switchConversationBranch,
} from "@/backend/chat/conversations";
import { estimateCostUsd } from "@/backend/analytics/pricing";
import { createNote } from "@/backend/jarvis/notes";
import { ConversationSidebar } from "./conversation-sidebar";
import { MessageList, type ChatMessage } from "./message-list";
import { MessageInput, type PendingAttachment } from "./message-input";
import { ModelSelect } from "./model-select";
import { ChatCanvas } from "./chat-canvas";
import { ContextGauge } from "./context-gauge";
import { ConversationCost } from "./conversation-cost";

const MODEL_STORAGE_KEY = "claudette.model";
const WEB_SEARCH_STORAGE_KEY = "claudette.webSearch";
/** Soft context window estimate for the gauge (Sonnet-class). */
const CONTEXT_LIMIT_TOKENS = 200_000;

function branchDefaults(
  partial: Omit<
    ChatMessage,
    "parent_id" | "branchIndex" | "branchCount" | "siblingIds"
  > &
    Partial<
      Pick<ChatMessage, "parent_id" | "branchIndex" | "branchCount" | "siblingIds">
    >,
): ChatMessage {
  return {
    parent_id: null,
    branchIndex: 0,
    branchCount: 1,
    siblingIds: [],
    ...partial,
  };
}
type Props = {
  initialConversations: Conversation[];
  /** When true, composer is locked (Louis joke mode). */
  claudetteBlocked?: boolean;
  claudetteBlockMessage?: string;
};

type LastRequest =
  | {
      kind: "send";
      content: string;
      attachmentIds: string[];
      editMessageId: string | null;
      webSearch: boolean;
    }
  | {
      kind: "regenerate";
      messageId: string;
      webSearch: boolean;
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
    return "Rate limit - Claudette needs a short breath. Retry in a moment.";
  }
  if (status === 408 || lower.includes("timeout") || lower.includes("timed out")) {
    return "Timed out waiting for a reply. Worth another try.";
  }
  return raw || "Something went wrong sending that message.";
}

export function ChatShell({
  initialConversations,
  claudetteBlocked = false,
  claudetteBlockMessage,
}: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  // Claude.ai style: land on a blank draft; persist only after first send.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
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
  const [webSearch, setWebSearch] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<{
    message: string;
    onRetry: () => void;
  } | null>(null);
  const [canvas, setCanvas] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [usageTotals, setUsageTotals] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalCostUsd: 0,
  });
  const [contextUsedTokens, setContextUsedTokens] = useState(0);
  const [switchDirection, setSwitchDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const loadingConvRef = useRef<string | null>(null);
  const lastRequestRef = useRef<LastRequest | null>(null);
  const createPromiseRef = useRef<Promise<string> | null>(null);
  const uploadAbortRef = useRef(new Map<string, AbortController>());
  const prevActiveRef = useRef<string | null>(null);
  /** Skip wipe/reload when temp id is swapped for the real conversation id mid-send. */
  const suppressNextLoadRef = useRef(false);
  function isTempConversationId(id: string) {
    return id.startsWith("temp-");
  }

  const loadMessages = useCallback(async (conversationId: string) => {
    if (isTempConversationId(conversationId)) {
      setMessages([]);
      setLoadingMessages(false);
      setUsageTotals({ inputTokens: 0, outputTokens: 0, totalCostUsd: 0 });
      setContextUsedTokens(0);
      return;
    }
    loadingConvRef.current = conversationId;
    setLoadingMessages(true);
    try {
      const [rows, usage] = await Promise.all([
        getConversationMessages(conversationId),
        getConversationUsageTotals(conversationId).catch(() => ({
          inputTokens: 0,
          outputTokens: 0,
          totalCostUsd: 0,
        })),
      ]);
      if (loadingConvRef.current !== conversationId) return;
      setMessages(rows);
      setUsageTotals(usage);
      const approxChars = rows.reduce((sum, m) => sum + m.content.length, 0);
      setContextUsedTokens(Math.round(approxChars / 4));
    } finally {
      if (loadingConvRef.current === conversationId) {
        setLoadingMessages(false);
      }
    }
  }, []);
  useEffect(() => {
    if (!activeId) {
      setLoadingMessages(false);
      startTransition(() => {
        setMessages([]);
      });
      return;
    }
    if (isTempConversationId(activeId)) {
      setLoadingMessages(false);
      // Keep any in-flight optimistic draft; only clear when truly empty draft.
      return;
    }
    // First send: temp → real id. Keep optimistic user/assistant bubbles.
    if (suppressNextLoadRef.current) {
      suppressNextLoadRef.current = false;
      loadingConvRef.current = activeId;
      setLoadingMessages(false);
      return;
    }
    setLoadingMessages(true);
    setMessages([]);
    startTransition(() => {
      void loadMessages(activeId).catch((err: unknown) => {
        setLoadingMessages(false);
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
    try {
      const stored = window.localStorage.getItem(WEB_SEARCH_STORAGE_KEY);
      if (stored === "1" || stored === "true") setWebSearch(true);
    } catch {
      // ignore
    }
  }, []);

  function handleWebSearchChange(next: boolean) {
    setWebSearch(next);
    try {
      window.localStorage.setItem(WEB_SEARCH_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
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
    } else if (activeId && !list.some((c) => c.id === activeId)) {
      // Active chat deleted elsewhere - back to blank draft
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
    // Drop any optimistic temp row; stay on an unsaved draft.
    setConversations((prev) => prev.filter((c) => !isTempConversationId(c.id)));
    setActiveId(null);
    setMessages([]);
    clearComposer();
    setMobileOpen(false);
    createPromiseRef.current = null;
  }

  async function handleDelete(id: string) {
    setThreadError(null);
    const snapshot = conversations;
    const next = conversations.filter((c) => c.id !== id);
    setConversations(next);
    if (activeId === id) {
      setActiveId(null);
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
            topic: null,
            topic_at: null,
            active_leaf_id: null,
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
        // Preserve optimistic thread when swapping temp → persisted id
        suppressNextLoadRef.current = true;
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
            const finalContent =
              typeof payload.content === "string" ? payload.content : undefined;
            const usage = payload.usage as
              | {
                  input_tokens?: number | null;
                  output_tokens?: number | null;
                  cache_creation_input_tokens?: number | null;
                  cache_read_input_tokens?: number | null;
                }
              | undefined;
            const doneModel =
              typeof payload.model === "string" ? payload.model : model;
            const costUsd =
              usage != null
                ? estimateCostUsd({
                    model: doneModel,
                    inputTokens: usage.input_tokens,
                    outputTokens: usage.output_tokens,
                    cacheCreationTokens: usage.cache_creation_input_tokens,
                    cacheReadTokens: usage.cache_read_input_tokens,
                  })
                : null;

            if (usage?.input_tokens != null) {
              setContextUsedTokens(usage.input_tokens);
            }
            if (costUsd != null) {
              setUsageTotals((prev) => ({
                inputTokens:
                  prev.inputTokens + (usage?.input_tokens ?? 0),
                outputTokens:
                  prev.outputTokens + (usage?.output_tokens ?? 0),
                totalCostUsd: prev.totalCostUsd + costUsd,
              }));
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === options.streamId
                  ? {
                      ...m,
                      id: assistantId,
                      streaming: false,
                      content: finalContent ?? m.content,
                      costUsd,
                      copySegmentsLoading: true,
                      copySegments: [],
                    }
                  : m,
              ),
            );

    // Refresh branch metadata after settle — don't flip loading skeleton
    void (async () => {
      try {
        const rows = await getConversationMessages(conversationId);
        if (loadingConvRef.current && loadingConvRef.current !== conversationId) {
          return;
        }
        setMessages(rows);
        const usage = await getConversationUsageTotals(conversationId).catch(
          () => null,
        );
        if (usage) setUsageTotals(usage);
      } catch {
        /* keep optimistic path */
      }
    })();

            const textForSegments = finalContent;
            if (textForSegments && textForSegments.trim().length >= 48) {
              void fetch("/api/claude/copy-segments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: textForSegments }),
              })
                .then(async (res) => {
                  if (!res.ok) return { segments: [] as { label: string; text: string }[] };
                  return (await res.json()) as {
                    segments?: { label: string; text: string }[];
                  };
                })
                .then((body) => {
                  const segments = Array.isArray(body.segments)
                    ? body.segments
                    : [];
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            copySegments: segments,
                            copySegmentsLoading: false,
                          }
                        : m,
                    ),
                  );
                })
                .catch(() => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, copySegmentsLoading: false }
                        : m,
                    ),
                  );
                });
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, copySegmentsLoading: false }
                    : m,
                ),
              );
            }
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
    if (claudetteBlocked) return;
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
      webSearch,
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
      const branchedUserId = `branch-${crypto.randomUUID()}`;
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === editingMessageId);
        if (index < 0) return prev;
        const kept = prev.slice(0, index);
        const parentId = prev[index]?.parent_id ?? null;
        return [
          ...kept,
          branchDefaults({
            id: branchedUserId,
            conversation_id: conversationId,
            role: "user",
            content,
            created_at: new Date().toISOString(),
            token_count: null,
            attachments: optimisticAttachments,
            pending: true,
            parent_id: parentId,
            branchCount: (prev[index]?.branchCount ?? 1) + 1,
          }),
          branchDefaults({
            id: streamId,
            conversation_id: conversationId,
            role: "assistant",
            content: "",
            created_at: new Date().toISOString(),
            token_count: null,
            attachments: [],
            streaming: true,
            parent_id: branchedUserId,
          }),
        ];
      });
    } else {
      setMessages((prev) => [
        ...prev,
        branchDefaults({
          id: optimisticId,
          conversation_id: conversationId,
          role: "user",
          content,
          created_at: new Date().toISOString(),
          token_count: null,
          attachments: optimisticAttachments,
          pending: true,
          parent_id: prev[prev.length - 1]?.id ?? null,
        }),
        branchDefaults({
          id: streamId,
          conversation_id: conversationId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          token_count: null,
          attachments: [],
          streaming: true,
          parent_id: optimisticId,
        }),
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
        web_search: webSearch,
      },
      {
        optimisticUserId: editId ? undefined : optimisticId,
        editId,
        streamId,
      },
    );
  }

  async function handleRegenerate(message: ChatMessage) {
    if (!activeId || streaming || claudetteBlocked) return;
    setThreadError(null);
    const streamId = `stream-${crypto.randomUUID()}`;
    lastRequestRef.current = {
      kind: "regenerate",
      messageId: message.id,
      webSearch,
    };

    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === message.id);
      if (index < 0) return prev;
      if (message.role === "user") {
        const kept = prev.slice(0, index + 1);
        return [
          ...kept,
          branchDefaults({
            id: streamId,
            conversation_id: activeId,
            role: "assistant",
            content: "",
            created_at: new Date().toISOString(),
            token_count: null,
            attachments: [],
            streaming: true,
            parent_id: message.id,
            branchCount: (message.branchCount ?? 1) + 1,
          }),
        ];
      }
      const kept = prev.slice(0, index);
      return [
        ...kept,
        branchDefaults({
          id: streamId,
          conversation_id: activeId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          token_count: null,
          attachments: [],
          streaming: true,
          parent_id: message.parent_id,
          branchCount: (message.branchCount ?? 1) + 1,
        }),
      ];
    });
    await runStream(
      activeId,
      {
        conversation_id: activeId,
        regenerate_message_id: message.id,
        model,
        web_search: webSearch,
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

  async function handleBranchNav(message: ChatMessage, siblingId: string) {
    if (!activeId || streaming) return;
    const direction =
      siblingId && message.siblingIds.indexOf(siblingId) < message.branchIndex
        ? "left"
        : "right";
    setSwitchDirection(direction);
    try {
      const rows = await switchConversationBranch(activeId, siblingId);
      setMessages(rows);
    } catch (err) {
      setThreadError({
        message: err instanceof Error ? err.message : "Could not switch branch",
        onRetry: () => void handleBranchNav(message, siblingId),
      });
    } finally {
      window.setTimeout(() => setSwitchDirection(null), 500);
    }
  }

  async function handleSummarize(_message: ChatMessage) {
    if (!activeId) return;
    try {
      const res = await fetch("/api/claude/summarize-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: activeId }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Summarize failed");
      setCanvas({
        title: "Thread summary",
        content: data.summary ?? "",
      });
    } catch (err) {
      setThreadError({
        message: err instanceof Error ? err.message : "Summarize failed",
        onRetry: () => void handleSummarize(_message),
      });
    }
  }

  async function handleSaveAsNote(message: ChatMessage) {
    try {
      const note = await createNote({
        title: `From Claudette · ${new Date().toLocaleDateString()}`,
        content: message.content,
      });
      window.open(`/today/notes/${note.id}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      setThreadError({
        message: err instanceof Error ? err.message : "Could not save note",
        onRetry: () => void handleSaveAsNote(message),
      });
    }
  }

  const activeTitle =
    activeId == null
      ? "New conversation"
      : (conversations.find((c) => c.id === activeId)?.title ?? "Claudette");

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed((v) => !v)}
        onCloseMobile={() => setMobileOpen(false)}
        onSelect={(id) => {
          if (streaming) return;
          const prev = prevActiveRef.current;
          if (prev && conversations.length) {
            const prevIdx = conversations.findIndex((c) => c.id === prev);
            const nextIdx = conversations.findIndex((c) => c.id === id);
            setSwitchDirection(
              nextIdx >= 0 && prevIdx >= 0 && nextIdx < prevIdx ? "left" : "right",
            );
            window.setTimeout(() => setSwitchDirection(null), 500);
          }
          prevActiveRef.current = id;
          setActiveId(id);
          setMessages([]);
          setLoadingMessages(true);
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

      <div className="relative flex min-w-0 flex-1 flex-col">
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
          <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="hidden min-w-[9rem] flex-col items-end gap-1 sm:flex">
              <ContextGauge
                usedTokens={contextUsedTokens}
                limitTokens={CONTEXT_LIMIT_TOKENS}
              />
              <ConversationCost
                totalCostUsd={usageTotals.totalCostUsd}
                inputTokens={usageTotals.inputTokens}
                outputTokens={usageTotals.outputTokens}
              />
            </div>
            <ModelSelect
              value={model}
              disabled={streaming}
              onChange={handleModelChange}
            />
          </div>
        </div>

        <MessageList
          messages={messages}
          streaming={streaming}
          loading={loadingMessages}
          threadError={threadError}
          switchDirection={switchDirection}
          onEdit={handleEdit}
          onRegenerate={(message) => {
            void handleRegenerate(message);
          }}
          onCopy={handleCopy}
          onSuggestedPrompt={handleSuggestedPrompt}
          onBranchNav={(message, siblingId) => {
            void handleBranchNav(message, siblingId);
          }}
          onSummarize={(message) => {
            void handleSummarize(message);
          }}
          onSaveAsNote={(message) => {
            void handleSaveAsNote(message);
          }}
          onOpenCanvas={(payload) => setCanvas(payload)}
        />

        {claudetteBlocked && claudetteBlockMessage ? (
          <div
            className="mx-4 mb-3 border border-accent bg-accent-soft/70 px-4 py-3 sm:mx-0"
            role="status"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
              Accès refusé
            </p>
            <p className="mt-1.5 font-display text-lg leading-snug text-ink">
              {claudetteBlockMessage}
            </p>
          </div>
        ) : null}

        <MessageInput
          disabled={streaming || claudetteBlocked}
          streaming={streaming}
          editingContent={editingContent}
          attachments={pendingAttachments}
          webSearch={webSearch}
          webSearchDisabledReason={
            claudetteBlocked
              ? "…"
              : model.toLowerCase().includes("haiku")
                ? "Unavailable on Haiku"
                : null
          }
          onWebSearchChange={handleWebSearchChange}
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
            if (claudetteBlocked) return;
            void handlePickFiles(files);
          }}
          onSend={(content) => {
            void handleSend(content);
          }}
          onStop={handleStop}
        />

        <ChatCanvas
          open={Boolean(canvas)}
          title={canvas?.title ?? ""}
          content={canvas?.content ?? ""}
          onClose={() => setCanvas(null)}
        />
      </div>
    </div>
  );
}

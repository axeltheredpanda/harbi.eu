import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/backend/supabase/server";
import { anthropic } from "@/backend/anthropic";
import {
  buildAnthropicMessages,
  buildSystemBlocks,
  mediaTypeFromPath,
  prepareContext,
  type ContextMessage,
} from "@/backend/chat/context";
import { summarizeMessages } from "@/backend/chat/summarize";
import {
  CHAT_STORAGE_BUCKET,
  MAX_TOKENS,
  resolveChatModel,
} from "@/backend/chat/constants";
import { generateConversationTitle } from "@/backend/chat/title";
import { getClaudetteSettings } from "@/backend/claudette/settings";
import {
  recordClaudeUsage,
  recordServiceEvent,
} from "@/backend/analytics/record";
import { getPublicSiteSettings } from "@/backend/settings";
import { isLouisEmail, LOUIS_COPY } from "@/backend/louis";
import type { Attachment, Message } from "@/backend/supabase/types";

type Body = {
  conversation_id?: string;
  content?: string;
  attachment_ids?: string[];
  edit_message_id?: string;
  regenerate_message_id?: string;
  model?: string;
  /** Per-message override; when set, ignores Claudette settings default. */
  web_search?: boolean;
};

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const site = await getPublicSiteSettings();
  if (site.louisJokeMode && isLouisEmail(user.email)) {
    return new Response(JSON.stringify({ error: LOUIS_COPY.claudetteBlock }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversationId = body.conversation_id;
  const content = String(body.content ?? "").trim();
  const attachmentIds = Array.isArray(body.attachment_ids)
    ? body.attachment_ids.filter((id): id is string => typeof id === "string")
    : [];
  const editMessageId = body.edit_message_id;
  const regenerateMessageId = body.regenerate_message_id;
  const isRegenerate = Boolean(regenerateMessageId);
  const chatModel = resolveChatModel(body.model);

  if (!conversationId) {
    return new Response(JSON.stringify({ error: "conversation_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isRegenerate && !content && attachmentIds.length === 0) {
    return new Response(JSON.stringify({ error: "content or attachments required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (convError || !conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Edit / regenerate / new message paths
  let userMessageId: string;
  let userMessageContent = content;
  let shouldGenerateTitle = false;

  if (regenerateMessageId) {
    const { data: target, error: targetError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", regenerateMessageId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (targetError || !target) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (target.role === "assistant") {
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId)
        .gte("created_at", target.created_at);

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: priorUser } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("role", "user")
        .lt("created_at", target.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!priorUser) {
        return new Response(JSON.stringify({ error: "Nothing to regenerate from" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      userMessageId = priorUser.id;
      userMessageContent = priorUser.content;
    } else {
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId)
        .gt("created_at", target.created_at);

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      userMessageId = target.id;
      userMessageContent = target.content;
    }
  } else if (editMessageId) {
    const { data: existing, error: existingError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", editMessageId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (existingError || !existing || existing.role !== "user") {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId)
      .gt("created_at", existing.created_at);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("messages")
      .update({ content: userMessageContent })
      .eq("id", editMessageId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    userMessageId = editMessageId;

    if (attachmentIds.length > 0) {
      await supabase
        .from("attachments")
        .update({ message_id: userMessageId })
        .in("id", attachmentIds)
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId);
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: userMessageContent,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return new Response(JSON.stringify({ error: insertError?.message ?? "Insert failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    userMessageId = inserted.id;

    if (attachmentIds.length > 0) {
      const { error: linkError } = await supabase
        .from("attachments")
        .update({ message_id: userMessageId })
        .in("id", attachmentIds)
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId)
        .is("message_id", null);

      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Title is generated after the first full exchange (user + assistant).
    shouldGenerateTitle = conversation.title === "New conversation";
  }

  // Load full history + attachments
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError || !messages) {
    return new Response(JSON.stringify({ error: messagesError?.message ?? "Load failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("conversation_id", conversationId);

  const byMessage = new Map<string, Attachment[]>();
  for (const attachment of attachments ?? []) {
    if (!attachment.message_id) continue;
    const list = byMessage.get(attachment.message_id) ?? [];
    list.push(attachment);
    byMessage.set(attachment.message_id, list);
  }

  const contextMessages: ContextMessage[] = messages.map((message: Message) => ({
    ...message,
    attachments: byMessage.get(message.id) ?? [],
  }));

  const claudette = await getClaudetteSettings();
  const profile = claudette.profile;
  // Per-message toggle wins; settings default is only a fallback for old clients
  const webSearchEnabled =
    typeof body.web_search === "boolean"
      ? body.web_search
      : claudette.webSearchEnabled;
  // Managed web search is unreliable on Haiku — keep tools for Sonnet/Opus family
  const allowWebSearch =
    webSearchEnabled && !chatModel.toLowerCase().includes("haiku");

  let prepared = prepareContext(
    contextMessages,
    conversation.summary,
    conversation.summary_until_message_id,
    profile,
  );

  let summary = conversation.summary;

  if (prepared.needsSummaryRefresh && prepared.olderMessages.length > 0) {
    const lastSummarizedIndex = conversation.summary_until_message_id
      ? prepared.olderMessages.findIndex(
          (m) => m.id === conversation.summary_until_message_id,
        )
      : -1;
    const toSummarize =
      lastSummarizedIndex >= 0
        ? prepared.olderMessages.slice(lastSummarizedIndex + 1)
        : prepared.olderMessages;

    if (toSummarize.length > 0) {
      try {
        summary = await summarizeMessages(
          toSummarize.map((m) => ({ role: m.role, content: m.content })),
          conversation.summary,
        );
        const untilId = prepared.olderMessages[prepared.olderMessages.length - 1]?.id ?? null;
        await supabase
          .from("conversations")
          .update({
            summary,
            summary_until_message_id: untilId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId);

        const pdfTexts = [...prepared.olderMessages, ...prepared.windowMessages]
          .flatMap((m) => m.attachments)
          .filter((a) => a.type === "pdf" && a.extracted_text)
          .map((a) => a.extracted_text as string);

        prepared = {
          ...prepared,
          system: buildSystemBlocks(summary, pdfTexts, profile),
          needsSummaryRefresh: false,
        };
      } catch {
        // Continue without refreshed summary
      }
    }
  }

  // Load image bytes only for the last user message's image attachments
  const lastUser = [...prepared.windowMessages].reverse().find((m) => m.role === "user");
  const imageBytesByAttachmentId = new Map<
    string,
    { data: string; mediaType: string }
  >();

  if (lastUser) {
    for (const attachment of lastUser.attachments) {
      if (attachment.type !== "image") continue;
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(CHAT_STORAGE_BUCKET)
        .download(attachment.storage_path);
      if (downloadError || !fileData) continue;
      const buffer = await fileData.arrayBuffer();
      imageBytesByAttachmentId.set(attachment.id, {
        data: arrayBufferToBase64(buffer),
        mediaType: mediaTypeFromPath(attachment.storage_path),
      });
    }
  }

  const anthropicMessages = await buildAnthropicMessages(
    prepared.windowMessages,
    imageBytesByAttachmentId,
  );

  const encoder = new TextEncoder();
  let assistantText = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let cacheCreationTokens: number | null = null;
  let cacheReadTokens: number | null = null;
  let aborted = false;
  const streamStartedAt = Date.now();
  let firstTokenAt: number | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };

      if (!isRegenerate) {
        send("user_message", {
          id: userMessageId,
          content: userMessageContent,
          conversation_id: conversationId,
        });
      }

      try {
        const streamParams: Anthropic.MessageCreateParams = {
          model: chatModel,
          max_tokens: MAX_TOKENS,
          system: prepared.system,
          messages: anthropicMessages,
        };

        if (allowWebSearch) {
          streamParams.tools = [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 3,
              user_location: {
                type: "approximate",
                country: "FR",
                city: "Rueil-Malmaison",
                timezone: "Europe/Paris",
              },
            },
          ];
        }

        const anthropicStream = anthropic.messages.stream(streamParams, {
          signal: request.signal,
        });

        anthropicStream.on("text", (text) => {
          if (firstTokenAt == null) firstTokenAt = Date.now();
          assistantText += text;
          send("delta", { text });
        });

        const finalMessage = await anthropicStream.finalMessage();
        inputTokens = finalMessage.usage?.input_tokens ?? null;
        outputTokens = finalMessage.usage?.output_tokens ?? null;
        const usage = finalMessage.usage as {
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
        } | undefined;
        cacheCreationTokens = usage?.cache_creation_input_tokens ?? null;
        cacheReadTokens = usage?.cache_read_input_tokens ?? null;
      } catch (error) {
        if (request.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
          aborted = true;
        } else if (error instanceof Anthropic.APIError) {
          await recordServiceEvent({
            userId: user.id,
            service: "claude",
            kind: "error",
            detail: error.message,
            meta: { model: chatModel },
          });
          await recordClaudeUsage({
            userId: user.id,
            conversationId,
            model: chatModel,
            webSearch: allowWebSearch,
            error: error.message,
            totalMs: Date.now() - streamStartedAt,
          });
          send("error", { message: error.message });
          controller.close();
          return;
        } else {
          const message =
            error instanceof Error ? error.message : "Stream failed";
          await recordServiceEvent({
            userId: user.id,
            service: "claude",
            kind: "error",
            detail: message,
            meta: { model: chatModel },
          });
          send("error", { message });
          controller.close();
          return;
        }
      }

      // Persist assistant message (including partial on abort)
      let assistantId: string | null = null;
      if (assistantText.trim() || aborted) {
        const { data: assistantRow } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            role: "assistant",
            content: assistantText,
            token_count: outputTokens,
          })
          .select("id")
          .single();

        assistantId = assistantRow?.id ?? null;
      }

      await recordClaudeUsage({
        userId: user.id,
        conversationId,
        messageId: assistantId,
        model: chatModel,
        inputTokens,
        outputTokens,
        cacheCreationTokens,
        cacheReadTokens,
        ttftMs: firstTokenAt != null ? firstTokenAt - streamStartedAt : null,
        totalMs: Date.now() - streamStartedAt,
        webSearch: allowWebSearch,
        aborted,
      });

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      if (shouldGenerateTitle && !aborted && assistantText.trim()) {
        try {
          const { title, topic } = await generateConversationTitle(
            userMessageContent,
            assistantText,
          );
          await supabase
            .from("conversations")
            .update({
              title,
              topic,
              topic_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
          send("title", { title });
        } catch {
          // Keep "New conversation" if title generation fails
        }
      }

      send("done", {
        assistant_message_id: assistantId,
        content: assistantText,
        aborted,
        model: chatModel,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cache_creation_input_tokens: cacheCreationTokens,
          cache_read_input_tokens: cacheReadTokens,
        },
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

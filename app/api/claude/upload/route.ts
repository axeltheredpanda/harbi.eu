import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import { extractPdfText } from "@/backend/chat/pdf";
import {
  CHAT_STORAGE_BUCKET,
  MAX_UPLOAD_BYTES,
} from "@/backend/chat/constants";
import { getPublicSiteSettings } from "@/backend/settings";
import { isLouisEmail, LOUIS_COPY } from "@/backend/louis";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function extensionFor(mime: string, filename: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  const fromName = filename.split(".").pop();
  return fromName && fromName.length <= 5 ? fromName : "bin";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const site = await getPublicSiteSettings();
  if (site.louisJokeMode && isLouisEmail(user.email)) {
    return NextResponse.json(
      { error: LOUIS_COPY.claudetteBlock },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const conversationId = String(form.get("conversation_id") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const mime = file.type || "application/octet-stream";
  const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = IMAGE_TYPES.has(mime);

  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Only PDF and image uploads are supported" },
      { status: 400 },
    );
  }

  const type = isPdf ? "pdf" : "image";
  const ext = extensionFor(mime, file.name);
  const storagePath = `${user.id}/${conversationId}/${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(CHAT_STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: isPdf ? "application/pdf" : mime,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 502 });
  }

  let extractedText: string | null = null;
  if (isPdf) {
    try {
      extractedText = await extractPdfText(buffer);
    } catch {
      extractedText = null;
    }
  }

  const { data: attachment, error: insertError } = await supabase
    .from("attachments")
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      message_id: null,
      type,
      storage_path: storagePath,
      extracted_text: extractedText,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from(CHAT_STORAGE_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 502 });
  }

  return NextResponse.json({
    id: attachment.id,
    type: attachment.type,
    storage_path: attachment.storage_path,
    name: file.name,
    extracted_text_preview: extractedText?.slice(0, 200) ?? null,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import { extractCopySegments } from "@/backend/chat/copy-segments";
import { getPublicSiteSettings } from "@/backend/settings";
import { isLouisEmail, LOUIS_COPY } from "@/backend/louis";

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

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = String(body.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ segments: [] });
  }

  try {
    const segments = await extractCopySegments(content);
    return NextResponse.json({ segments });
  } catch (err) {
    console.warn("copy-segments", err);
    return NextResponse.json({ segments: [] });
  }
}

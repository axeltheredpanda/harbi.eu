import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import { parseProfileFromPaste } from "@/backend/claudette/parse-profile";
import { normalizeProfile } from "@/backend/claudette/profile";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    paste?: string;
    existing?: unknown;
  } | null;

  const paste = body?.paste?.trim() ?? "";
  if (!paste) {
    return NextResponse.json({ error: "Paste some text first" }, { status: 400 });
  }

  try {
    const profile = await parseProfileFromPaste(
      paste,
      normalizeProfile(body?.existing),
    );
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Couldn’t extract profile fields from that paste",
      },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import { generateAllBriefings } from "@/backend/jarvis/briefing";

export const maxDuration = 60;

function authorized(request: Request, userId: string | undefined): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;
  return Boolean(userId);
}

/** Daily briefing cron — one Haiku call per user with notes, once per day. */
export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY required" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!authorized(request, user?.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateAllBriefings();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Briefing failed" },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}

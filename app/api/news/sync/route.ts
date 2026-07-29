import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import { syncNewsFeeds } from "@/backend/news/sync";

export const maxDuration = 60;

function authorized(request: Request, userId: string | undefined): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;
  // Logged-in owner can trigger a manual sync from /news
  return Boolean(userId);
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          "Set SUPABASE_SERVICE_ROLE_KEY (and CRON_SECRET for Vercel Cron) to sync feeds.",
      },
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

  const body = (await request.json().catch(() => ({}))) as {
    feedIds?: string[];
  };

  try {
    const result = await syncNewsFeeds(body.feedIds);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Sync failed",
      },
      { status: 502 },
    );
  }
}

/** Vercel Cron uses GET by default on some setups — accept both. */
export async function GET(request: Request) {
  return POST(request);
}

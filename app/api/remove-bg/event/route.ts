import { NextResponse } from "next/server";
import { createClient } from "@/backend/supabase/server";
import { recordServiceEvent } from "@/backend/analytics/record";

/** Lightweight cutout analytics events from the browser. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    kind?: "error" | "timeout" | "info";
    detail?: string;
    durationMs?: number;
    mode?: string;
  };

  await recordServiceEvent({
    userId: user.id,
    service: "cutout",
    kind: body.kind === "timeout" ? "timeout" : body.kind === "info" ? "info" : "error",
    detail: body.detail,
    durationMs: body.durationMs,
    meta: { mode: body.mode },
  });

  return NextResponse.json({ ok: true });
}

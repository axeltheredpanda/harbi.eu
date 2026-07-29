import { NextResponse } from "next/server";
import { markItemsRead } from "@/backend/news/sync";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    itemIds?: string[];
    all?: boolean;
    read?: boolean;
  };

  try {
    const count = await markItemsRead({
      itemIds: body.itemIds,
      all: body.all,
      read: body.read !== false,
    });
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Unauthorized" ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

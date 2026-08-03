import { NextResponse } from "next/server";
import { processNoteIfChanged } from "@/backend/jarvis/process";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    noteId?: string;
  };
  if (!body.noteId) {
    return NextResponse.json({ error: "noteId required" }, { status: 400 });
  }

  try {
    const result = await processNoteIfChanged(body.noteId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Process failed";
    const status = message === "Unauthorized" ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

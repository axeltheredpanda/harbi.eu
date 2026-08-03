import { streamRagAnswer } from "@/backend/jarvis/rag";

export const maxDuration = 60;

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
  };
  const question = body.question?.trim() ?? "";
  if (!question) {
    return new Response(JSON.stringify({ error: "question required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sse(event, data)));
      };
      try {
        const result = await streamRagAnswer(question, {
          onCitations: (notes) => send("citations", { notes }),
          onDelta: (text) => send("delta", { text }),
        });
        send("done", { usage: result.usage ?? null });
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Ask failed",
        });
      } finally {
        controller.close();
      }
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

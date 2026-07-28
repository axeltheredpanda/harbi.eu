import { getWatchlistQuotes } from "@/backend/market";

export async function GET() {
  try {
    const quotes = await getWatchlistQuotes();
    return Response.json({ quotes });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Market fetch failed" },
      { status: 502 },
    );
  }
}

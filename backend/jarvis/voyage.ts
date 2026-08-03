import {
  JARVIS_EMBED_DIMS,
  JARVIS_EMBED_MODEL,
} from "@/backend/jarvis/constants";

type VoyageEmbedResponse = {
  data?: { embedding: number[]; index: number }[];
  error?: string;
};

function voyageKey(): string {
  const key = process.env.VOYAGE_API_KEY?.trim();
  if (!key) {
    throw new Error("VOYAGE_API_KEY is not set");
  }
  return key;
}

/**
 * Embed text via Voyage AI (free tier). Returns a 512-d vector for voyage-3-lite.
 * Computed once per note content hash; search queries embed only the query string.
 */
export async function embedTexts(
  texts: string[],
  inputType: "document" | "query" = "document",
): Promise<number[][]> {
  if (!texts.length) return [];

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${voyageKey()}`,
    },
    body: JSON.stringify({
      model: JARVIS_EMBED_MODEL,
      input: texts.map((t) => t.slice(0, 24_000)),
      input_type: inputType,
    }),
  });

  const body = (await res.json()) as VoyageEmbedResponse;
  if (!res.ok) {
    throw new Error(body.error ?? `Voyage embed failed (${res.status})`);
  }

  const rows = body.data ?? [];
  return rows
    .sort((a, b) => a.index - b.index)
    .map((row) => {
      const emb = row.embedding;
      if (emb.length !== JARVIS_EMBED_DIMS) {
        // Truncate or pad defensively if model dims drift
        if (emb.length > JARVIS_EMBED_DIMS) return emb.slice(0, JARVIS_EMBED_DIMS);
        return [...emb, ...Array(JARVIS_EMBED_DIMS - emb.length).fill(0)];
      }
      return emb;
    });
}

export async function embedDocument(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text], "document");
  if (!vec) throw new Error("Empty embedding");
  return vec;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text], "query");
  if (!vec) throw new Error("Empty embedding");
  return vec;
}

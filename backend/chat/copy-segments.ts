import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/backend/anthropic";
import { SUMMARY_MODEL } from "@/backend/chat/constants";

export type CopySegment = {
  label: string;
  text: string;
};

/**
 * Cheap Haiku pass: find paste-ready excerpts (translations, slogans, emails…)
 * so the UI can offer one-tap copy without grabbing the whole reply.
 */
export async function extractCopySegments(
  content: string,
): Promise<CopySegment[]> {
  const trimmed = content.trim();
  if (trimmed.length < 48) return [];

  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You extract paste-ready excerpts from an assistant reply.

Return ONLY JSON: {"segments":[{"label":"short label","text":"exact excerpt"}]}

Include a segment when the user is likely to copy-paste it elsewhere:
- translations / localized copy
- slogans, taglines, email/SMS drafts
- final deliverable text blocks (not the surrounding explanation)
- short standalone paragraphs clearly meant for reuse

Skip:
- explanations, preambles, "here's the translation:"
- whole reply when it's just chatty Q&A
- huge dumps (prefer the crisp deliverable)

Rules:
- label: 1-4 words, lowercase ok, FR or EN matching the excerpt language
- text: verbatim from the message (preserve newlines inside the excerpt)
- max 5 segments; [] if nothing is copy-worthy
- do not invent text

Message:
"""
${trimmed.slice(0, 12_000)}
"""`,
      },
    ],
  });

  const raw = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as {
      segments?: { label?: string; text?: string }[];
    };
    const segments = Array.isArray(parsed.segments) ? parsed.segments : [];
    return segments
      .map((s) => ({
        label: String(s.label ?? "").trim().slice(0, 40),
        text: String(s.text ?? "").trim(),
      }))
      .filter((s) => s.label && s.text.length > 0)
      .slice(0, 5);
  } catch {
    return [];
  }
}

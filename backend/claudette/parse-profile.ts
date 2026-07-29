import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/backend/anthropic";
import {
  EMPTY_PROFILE,
  normalizeProfile,
  type ClaudetteProfile,
} from "@/backend/claudette/profile";
import { SUMMARY_MODEL } from "@/backend/chat/constants";

const PARSE_SYSTEM = `You extract a structured personal profile for Claudette, a private AI assistant.
Map the user's pasted notes into the JSON schema. Keep wording compact and faithful — do not invent facts.
If a field has no info, use an empty string.
Prefer French or English as written in the source; do not translate unless the source mixes both and clarity needs one language.
Merge related bullets into short prose or semicolon-separated fragments suitable for form fields.
Return ONLY valid JSON matching the schema — no markdown fences.`;

const SCHEMA_HINT = `{
  "firstName": string,
  "age": string,
  "location": string,
  "languages": string,
  "studies": string,
  "work": string,
  "companies": string,
  "projects": string,
  "communicationStyle": string,
  "interests": string,
  "vehicles": string,
  "people": string,
  "other": string
}`;

export async function parseProfileFromPaste(
  paste: string,
  existing?: ClaudetteProfile,
): Promise<ClaudetteProfile> {
  const trimmed = paste.trim();
  if (!trimmed) return existing ?? EMPTY_PROFILE;
  if (trimmed.length > 80_000) {
    throw new Error("Paste is too long (max ~80k characters)");
  }

  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 2500,
    system: PARSE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Existing profile (may be empty — fill / overwrite with better extracted data):\n${JSON.stringify(existing ?? EMPTY_PROFILE, null, 2)}\n\nPaste to extract:\n---\n${trimmed}\n---\n\nJSON schema:\n${SCHEMA_HINT}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Couldn’t parse the paste into profile fields");
  }

  const parsed = JSON.parse(jsonMatch[0]) as unknown;
  return normalizeProfile(parsed);
}

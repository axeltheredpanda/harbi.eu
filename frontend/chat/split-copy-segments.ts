export type CopySegmentInput = {
  label: string;
  text: string;
};

export type ContentPart =
  | { kind: "md"; content: string }
  | { kind: "segment"; label: string; text: string; content: string };

type Hit = {
  start: number;
  end: number;
  label: string;
  text: string;
};

function overlaps(a: Hit, b: { start: number; end: number }) {
  return !(a.end <= b.start || a.start >= b.end);
}

/**
 * Split assistant markdown into plain chunks and paste-ready segments
 * so the UI can wrap matches in a hover-to-copy region.
 */
export function splitContentByCopySegments(
  content: string,
  segments: CopySegmentInput[],
): ContentPart[] {
  if (!content || segments.length === 0) {
    return content ? [{ kind: "md", content }] : [];
  }

  const hits: Hit[] = [];

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    const start = content.indexOf(text);
    if (start === -1) continue;

    const end = start + text.length;
    const candidate = { start, end, label: segment.label, text };
    if (hits.some((hit) => overlaps(hit, candidate))) continue;
    hits.push(candidate);
  }

  hits.sort((a, b) => a.start - b.start);

  if (hits.length === 0) {
    return [{ kind: "md", content }];
  }

  const parts: ContentPart[] = [];
  let cursor = 0;

  for (const hit of hits) {
    if (hit.start > cursor) {
      parts.push({ kind: "md", content: content.slice(cursor, hit.start) });
    }
    parts.push({
      kind: "segment",
      label: hit.label,
      text: hit.text,
      content: content.slice(hit.start, hit.end),
    });
    cursor = hit.end;
  }

  if (cursor < content.length) {
    parts.push({ kind: "md", content: content.slice(cursor) });
  }

  return parts;
}

import type { Attachment, Message } from "@/backend/supabase/types";

export type BranchedMessage = Message & {
  attachments: Attachment[];
  branchIndex: number;
  branchCount: number;
  siblingIds: string[];
};

/** Walk parent_id chain from leaf → root, return chronological path. */
export function resolveActivePath<
  T extends { id: string; parent_id: string | null },
>(messages: T[], leafId: string | null): T[] {
  if (!messages.length) return [];
  const byId = new Map(messages.map((m) => [m.id, m]));

  let leaf = leafId ? byId.get(leafId) : undefined;
  if (!leaf) {
    leaf = messages[messages.length - 1];
  }

  const path: T[] = [];
  const seen = new Set<string>();
  let cursor: T | undefined = leaf;
  while (cursor && !seen.has(cursor.id)) {
    path.push(cursor);
    seen.add(cursor.id);
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
  }
  path.reverse();
  return path;
}

/** Sibling variants sharing the same parent_id (and role). */
export function listSiblings<
  T extends {
    id: string;
    parent_id: string | null;
    role: string;
    created_at: string;
  },
>(messages: T[], messageId: string): T[] {
  const target = messages.find((m) => m.id === messageId);
  if (!target) return [];
  return messages
    .filter(
      (m) => m.role === target.role && m.parent_id === target.parent_id,
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Latest descendant of a node (prefer newest created_at child recursively). */
export function findLeafFrom(messages: Message[], startId: string): string {
  const children = new Map<string | null, Message[]>();
  for (const m of messages) {
    const key = m.parent_id;
    const list = children.get(key) ?? [];
    list.push(m);
    children.set(key, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  let cursor = startId;
  for (;;) {
    const kids = children.get(cursor);
    if (!kids?.length) return cursor;
    cursor = kids[kids.length - 1]!.id;
  }
}

export function enrichPathWithBranches(
  all: (Message & { attachments: Attachment[] })[],
  leafId: string | null,
): BranchedMessage[] {
  const path = resolveActivePath(all, leafId);
  return path.map((message) => {
    const siblings = listSiblings(all, message.id);
    const index = Math.max(
      0,
      siblings.findIndex((s) => s.id === message.id),
    );
    return {
      ...message,
      branchIndex: index,
      branchCount: siblings.length,
      siblingIds: siblings.map((s) => s.id),
    };
  });
}

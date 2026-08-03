/** Extract unique [[wiki titles]] from note body. */
export function extractWikiTitles(content: string): string[] {
  const titles = new Set<string>();
  const re = /\[\[([^\[\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content))) {
    const title = match[1]?.trim();
    if (title) titles.add(title);
  }
  return [...titles];
}

/** Render [[Title]] as markdown-ish links for display (client can enhance). */
export function wikiTitleKey(title: string): string {
  return title.trim().toLowerCase();
}

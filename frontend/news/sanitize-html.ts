/** Light HTML allowlist for inline reading view (safe for client). */
export function sanitizeFeedHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(
      /<(?!\/?(?:p|br|a|em|strong|b|i|ul|ol|li|blockquote|h[1-6]|code|pre|img|figure|figcaption|hr|div|span)\b)[^>]+>/gi,
      "",
    );
}

import { listNotes } from "@/backend/notes";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://harbi.eu"
).replace(/\/$/, "");

function dayStamp(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function urlEntry(
  loc: string,
  lastmod: string,
  changefreq: "weekly" | "monthly",
  priority: string,
): string {
  return [
    "<url>",
    `<loc>${escapeXml(loc)}</loc>`,
    `<lastmod>${escapeXml(lastmod)}</lastmod>`,
    `<changefreq>${changefreq}</changefreq>`,
    `<priority>${priority}</priority>`,
    "</url>",
  ].join("");
}

/** Hourly ISR — enough for notes, keeps Googlebot hits cheap. */
export const revalidate = 3600;

/**
 * Custom sitemap route (not MetadataRoute) so we control headers.
 * Next's built-in `app/sitemap.ts` adds `Content-Disposition: inline;
 * filename="sitemap.xml"`, which Google Search Console often refuses
 * ("Impossible de lire le sitemap" / Couldn't fetch) even when the body is valid.
 */
export async function GET() {
  const notes = await listNotes().catch(() => []);
  const today = dayStamp(new Date());

  const entries = [
    urlEntry(`${SITE_URL}/`, today, "weekly", "1.0"),
    urlEntry(`${SITE_URL}/notes`, today, "weekly", "0.7"),
    ...notes.map((note) =>
      urlEntry(
        `${SITE_URL}/notes/${note.slug}`,
        dayStamp(note.date || today),
        "monthly",
        "0.6",
      ),
    ),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      // Explicitly omit Content-Disposition — GSC is picky about it.
    },
  });
}

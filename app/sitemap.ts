import type { MetadataRoute } from "next";
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const notes = await listNotes().catch(() => []);
  const today = dayStamp(new Date());

  const noteEntries: MetadataRoute.Sitemap = notes.map((note) => ({
    url: `${SITE_URL}/notes/${note.slug}`,
    lastModified: dayStamp(note.date || today),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/notes`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...noteEntries,
  ];
}

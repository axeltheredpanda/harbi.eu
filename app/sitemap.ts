import type { MetadataRoute } from "next";
import { listNotes } from "@/backend/notes";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://harbi.eu";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const notes = await listNotes().catch(() => []);

  const noteEntries: MetadataRoute.Sitemap = notes.map((note) => ({
    url: `${SITE_URL}/notes/${note.slug}`,
    lastModified: note.date ? new Date(note.date) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/notes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...noteEntries,
  ];
}

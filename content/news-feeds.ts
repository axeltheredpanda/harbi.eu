export type NewsFeed = {
  id: string;
  name: string;
  url: string;
  /** Editorial tags for filtering on /news */
  tags: string[];
  /** Max items kept per sync for this feed */
  limit?: number;
};

/**
 * Curated RSS/Atom sources — edit this list to change what gets imported.
 * Prefer official feeds over scrapers.
 */
export const NEWS_FEEDS: NewsFeed[] = [
  // General French news (TF1 has no public RSS — franceinfo is the closest reliable titre feed)
  {
    id: "franceinfo",
    name: "franceinfo",
    url: "https://www.franceinfo.fr/titres.rss",
    tags: ["france", "general"],
    limit: 15,
  },
  {
    id: "le-monde",
    name: "Le Monde",
    url: "https://www.lemonde.fr/rss/une.xml",
    tags: ["france", "general"],
    limit: 12,
  },
  {
    id: "racefans",
    name: "RaceFans",
    url: "https://www.racefans.net/feed/",
    tags: ["motorsport", "f1"],
    limit: 12,
  },
  {
    id: "dirtfish",
    name: "DirtFish",
    url: "https://dirtfish.com/feed/",
    tags: ["motorsport", "wrc"],
    limit: 10,
  },
  {
    id: "autosport",
    name: "Autosport",
    url: "https://www.autosport.com/rss/feed/f1",
    tags: ["motorsport", "f1"],
    limit: 12,
  },
  {
    id: "the-verge",
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    tags: ["tech"],
    limit: 10,
  },
  {
    id: "ars-technica",
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    tags: ["tech"],
    limit: 10,
  },
  {
    id: "hn-best",
    name: "Hacker News (best)",
    url: "https://hnrss.org/best",
    tags: ["tech"],
    limit: 10,
  },
];

export const NEWS_TAG_LABELS: Record<string, string> = {
  france: "France",
  general: "General",
  motorsport: "Motorsport",
  f1: "F1",
  wrc: "WRC",
  tech: "Tech",
  finance: "Finance",
  auto: "Auto",
};

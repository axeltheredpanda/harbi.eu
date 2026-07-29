import Link from "next/link";
import { NEWS_FEEDS, NEWS_TAG_LABELS } from "@/content/news-feeds";
import { listNewsItemsPublic } from "@/backend/news/sync";
import { NewsSyncButton } from "./news-sync-button";

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export const metadata = {
  title: "News",
  description: "A short shelf of headlines from curated RSS feeds.",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default async function NewsPage({ searchParams }: Props) {
  const { tag } = await searchParams;
  const activeTag = tag && NEWS_TAG_LABELS[tag] ? tag : undefined;
  const items = await listNewsItemsPublic({
    tag: activeTag,
    limit: 48,
  });

  const availableTags = Array.from(
    new Set(NEWS_FEEDS.flatMap((f) => f.tags)),
  ).sort();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col px-6 py-10 sm:px-8 sm:py-14">
      <header className="space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          Reading list
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            News
          </h1>
          <Link
            href="/"
            className="font-mono text-xs text-ink-faint transition-colors hover:text-ink"
          >
            ← harbi.eu
          </Link>
        </div>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          Headlines from a short RSS shelf — French general news, motorsport,
          and tech. Not a firehose.
        </p>
        <NewsSyncButton />
      </header>

      <nav className="mt-8 flex flex-wrap gap-2 border-y border-border py-3">
        <Link
          href="/news"
          className={`font-mono text-[11px] uppercase tracking-wide ${
            !activeTag ? "text-accent" : "text-ink-faint hover:text-ink"
          }`}
        >
          All
        </Link>
        {availableTags.map((t) => (
          <Link
            key={t}
            href={`/news?tag=${t}`}
            className={`font-mono text-[11px] uppercase tracking-wide ${
              activeTag === t ? "text-accent" : "text-ink-faint hover:text-ink"
            }`}
          >
            {NEWS_TAG_LABELS[t] ?? t}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="mt-12 text-sm text-ink-muted">
          Nothing here yet. Run the SQL migration, set{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>,
          then sync feeds (button above if you&apos;re logged in, or Vercel
          Cron).
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border border-t border-border">
          {items.map((item) => (
            <li key={item.id} className="py-5">
              <p className="font-mono text-[11px] tracking-wide text-ink-faint">
                {item.source_name}
                {item.published_at ? ` · ${formatDate(item.published_at)}` : ""}
              </p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block font-display text-lg text-ink transition-colors hover:text-accent sm:text-xl"
              >
                {item.title}
              </a>
              {item.summary && (
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
                  {item.summary}
                </p>
              )}
              {item.tags?.length > 0 && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                  {item.tags.map((t) => NEWS_TAG_LABELS[t] ?? t).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-16 border-t border-border pt-6">
        <p className="font-mono text-[11px] text-ink-faint">
          Sources: {NEWS_FEEDS.map((f) => f.name).join(", ")}. Edit{" "}
          <code className="text-ink-muted">content/news-feeds.ts</code> to
          change the shelf.
        </p>
      </footer>
    </div>
  );
}

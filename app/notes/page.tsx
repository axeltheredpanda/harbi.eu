import Link from "next/link";
import { listNotes } from "@/backend/notes";

export const metadata = {
  title: "Notes",
  description:
    "Short editorial notes by Arthur Reichard - reflections on building software and products.",
};

export default async function NotesIndexPage() {
  const notes = await listNotes();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12 sm:px-8 sm:py-16">
      <header className="flex items-baseline justify-between gap-4">
        <Link href="/" className="font-display text-lg tracking-tight text-ink hover:text-accent">
          harbi.eu
        </Link>
        <Link href="/" className="font-mono text-xs text-ink-muted hover:text-ink">
          ← home
        </Link>
      </header>

      <main className="mt-16 flex flex-1 flex-col">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Notes
        </h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-muted">
          Short reflections, written to be read.
        </p>

        <ul className="mt-12 flex flex-col">
          {notes.map((note) => (
            <li
              key={note.slug}
              className="border-t border-border py-8 first:border-t-0 first:pt-0"
            >
              <p className="font-mono text-[11px] tracking-wide text-ink-faint">
                {note.date}
              </p>
              <h2 className="mt-2 font-display text-2xl font-medium text-ink">
                <Link href={`/notes/${note.slug}`} className="hover:text-accent">
                  {note.title}
                </Link>
              </h2>
              <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-muted">
                {note.excerpt}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

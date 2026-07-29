import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getNote, listNotes } from "@/backend/notes";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const notes = await listNotes();
  return notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const note = await getNote(slug);
  if (!note) return { title: "Note · harbi.eu" };
  return {
    title: note.title,
    description: note.excerpt || `Note by Arthur Reichard - ${note.title}`,
    authors: [{ name: "Arthur Reichard" }],
  };
}

export default async function NotePage({ params }: Props) {
  const { slug } = await params;
  const note = await getNote(slug);
  if (!note) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12 sm:px-8 sm:py-16">
      <header className="flex items-baseline justify-between gap-4">
        <Link href="/" className="font-display text-lg tracking-tight text-ink hover:text-accent">
          harbi.eu
        </Link>
        <Link href="/notes" className="font-mono text-xs text-ink-muted hover:text-ink">
          ← notes
        </Link>
      </header>

      <article className="mt-16 flex flex-1 flex-col">
        <p className="font-mono text-[11px] tracking-wide text-ink-faint">{note.date}</p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          {note.title}
        </h1>
        <div className="markdown-body mt-10 max-w-prose text-base leading-relaxed text-ink-muted">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}

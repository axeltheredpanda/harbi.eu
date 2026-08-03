import Link from "next/link";
import { notFound } from "next/navigation";
import { getNote, listBacklinks } from "@/backend/jarvis/notes";
import { NoteEditor } from "./note-editor";

type Props = { params: Promise<{ id: string }> };

export default async function NotePage({ params }: Props) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();
  const backlinks = await listBacklinks(id).catch(() => []);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
        <Link href="/today" className="hover:text-accent-strong">
          Today
        </Link>
        {" · "}
        note
      </p>
      <NoteEditor note={note} backlinks={backlinks} />
    </div>
  );
}

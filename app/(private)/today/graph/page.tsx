import Link from "next/link";
import { listNotesForGraph } from "@/backend/jarvis/notes";

export const metadata = { title: "Graph" };

export default async function GraphPage() {
  const nodes = await listNotesForGraph().catch(() => []);
  const titleById = new Map(nodes.map((n) => [n.id, n.title]));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          <Link href="/today" className="hover:text-accent-strong">
            Today
          </Link>
          {" · "}
          graph
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          Note graph
        </h1>
        <p className="text-sm text-ink-muted">
          Wiki links as edges — a quiet map of how thoughts point at each other.
        </p>
      </header>

      {nodes.length === 0 ? (
        <p className="text-sm text-ink-muted">No notes to map yet.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {nodes.map((node) => (
            <li key={node.id} className="py-4">
              <Link
                href={`/today/notes/${node.id}`}
                className="font-display text-lg text-ink hover:text-accent"
              >
                {node.title}
              </Link>
              {node.links.length > 0 ? (
                <p className="mt-1 font-mono text-[11px] text-ink-faint">
                  →{" "}
                  {node.links.map((id, i) => (
                    <span key={id}>
                      {i > 0 ? ", " : ""}
                      <Link
                        href={`/today/notes/${id}`}
                        className="hover:text-accent"
                      >
                        {titleById.get(id) ?? id.slice(0, 8)}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : (
                <p className="mt-1 font-mono text-[11px] text-ink-faint">
                  no outbound links
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

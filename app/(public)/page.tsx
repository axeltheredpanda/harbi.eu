import Link from "next/link";
import { buttonClass } from "@/frontend/components/button-variants";

type Project = {
  name: string;
  description: string;
  tags: string[];
  url?: string;
};

const projects: Project[] = [
  {
    name: "Axel Project",
    description:
      "Add a one-line summary of what Axel Project does and the problem it solves.",
    tags: ["TODO", "add", "stack"],
  },
  {
    name: "Astraia",
    description:
      "Add a one-line summary of what Astraia does and the problem it solves.",
    tags: ["TODO", "add", "stack"],
  },
];

const stack = [
  { label: "Frontend", items: ["Next.js", "React", "TypeScript", "Tailwind CSS"] },
  { label: "Backend", items: ["Supabase", "PostgreSQL", "Node.js"] },
  { label: "Tools", items: ["Vercel", "Git", "Anthropic API"] },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-5 sm:px-10">
        <Link href="/" className="font-mono text-sm text-ink-muted">
          <span className="text-accent">~/</span>harbi.eu
        </Link>
        <nav className="hidden gap-6 font-mono text-xs tracking-wider text-ink-muted uppercase sm:flex">
          <a href="#projects" className="hover:text-ink">
            Projects
          </a>
          <a href="#stack" className="hover:text-ink">
            Stack
          </a>
          <a href="#contact" className="hover:text-ink">
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-xs text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          available for opportunities
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-28 sm:px-10">
          <p className="font-mono text-sm text-ink-muted">
            <span className="text-accent">~</span>/harbi
          </p>
          <h1 className="font-display text-5xl font-medium tracking-tight text-ink sm:text-6xl">
            Your Name<span className="cursor-blink text-accent">_</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink-muted">
            Software engineer building products end-to-end, from database schema to the
            pixel in front of the user. TODO: replace with your real one-liner.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="#contact" className={buttonClass("primary")}>
              Get in touch
            </a>
            <a href="/resume.pdf" className={buttonClass("secondary")}>
              Download résumé
            </a>
          </div>
        </section>

        <section id="projects" className="border-t border-border px-6 py-24 sm:px-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
            <div className="flex flex-col gap-2">
              <p className="font-mono text-sm text-accent">{"// projects"}</p>
              <h2 className="font-display text-2xl font-medium text-ink">Selected work</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.name}
                  className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6"
                >
                  <h3 className="font-display text-lg font-medium text-ink">
                    {project.name}
                  </h3>
                  <p className="flex-1 text-sm leading-relaxed text-ink-muted">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-border px-2 py-0.5 font-mono text-xs text-ink-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {project.url ? (
                    <a
                      href={project.url}
                      className="font-mono text-sm text-accent hover:text-accent-strong"
                    >
                      View project ↗
                    </a>
                  ) : (
                    <span className="font-mono text-sm text-ink-faint">Link coming soon</span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="stack" className="border-t border-border px-6 py-24 sm:px-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
            <div className="flex flex-col gap-2">
              <p className="font-mono text-sm text-accent">{"// stack"}</p>
              <h2 className="font-display text-2xl font-medium text-ink">
                What I build with
              </h2>
            </div>
            <dl className="flex flex-col gap-4">
              {stack.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-1 border-b border-border pb-4 last:border-0 last:pb-0 sm:grid-cols-[140px_1fr] sm:gap-4"
                >
                  <dt className="font-mono text-xs tracking-wider text-ink-muted uppercase">
                    {row.label}
                  </dt>
                  <dd className="text-ink">{row.items.join(" · ")}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="contact" className="border-t border-border px-6 py-24 sm:px-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <p className="font-mono text-sm text-accent">{"// contact"}</p>
            <h2 className="font-display text-3xl font-medium text-ink">Let&apos;s talk.</h2>
            <p className="max-w-lg text-ink-muted">
              Open to new opportunities — reach out and I&apos;ll get back to you.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-sm text-ink-muted">
              <a href="mailto:hello@harbi.eu" className="hover:text-ink">
                hello@harbi.eu
              </a>
              <span className="text-ink-faint">·</span>
              <a href="https://github.com/yourusername" className="hover:text-ink">
                GitHub
              </a>
              <span className="text-ink-faint">·</span>
              <a href="https://linkedin.com/in/yourusername" className="hover:text-ink">
                LinkedIn
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6 sm:px-10">
        <p className="font-mono text-xs text-ink-faint">~/harbi.eu</p>
      </footer>
    </div>
  );
}

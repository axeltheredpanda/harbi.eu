import Link from "next/link";

type Project = {
  name: string;
  description: string;
  url?: string;
};

const projects: Project[] = [
  {
    name: "Axel Project",
    description:
      "A product built end-to-end — still writing the proper one-line account of what it does and who it serves.",
  },
  {
    name: "Astraia",
    description:
      "Another piece of work in progress. The short version of the problem it solves belongs here.",
  },
];

const stackLines = [
  "On the interface: Next.js, React, TypeScript, Tailwind.",
  "Underneath: Supabase, PostgreSQL, Node.",
  "Around it: Vercel, Git, and the Anthropic API when the task asks for it.",
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-baseline justify-between gap-6 px-6 pt-10 sm:px-8">
        <Link
          href="/"
          className="font-display text-lg tracking-tight text-ink transition-colors hover:text-accent"
        >
          harbi.eu
        </Link>
        <nav className="flex gap-5 text-sm text-ink-muted">
          <a href="#work" className="transition-colors hover:text-ink">
            Work
          </a>
          <a href="#notes" className="transition-colors hover:text-ink">
            Notes
          </a>
          <a href="#contact" className="transition-colors hover:text-ink">
            Contact
          </a>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 sm:px-8">
        <section className="pb-20 pt-24 sm:pb-28 sm:pt-32">
          <p className="animate-rise text-sm tracking-wide text-ink-faint">
            Available for opportunities
          </p>
          <h1 className="animate-rise-delay mt-5 font-display text-[2.75rem] leading-[1.1] font-medium tracking-tight text-ink sm:text-6xl">
            Arthur Reichard
          </h1>
          <p className="animate-rise-delay-2 mt-8 max-w-xl text-lg leading-[1.7] text-ink-muted sm:text-xl sm:leading-[1.75]">
            I build software the long way around — schema to screen — and care
            about the parts that usually get rushed: naming, structure, and the
            sentence a product leaves in someone&apos;s head.
          </p>
          <p className="animate-rise-delay-2 mt-6 flex flex-wrap gap-x-6 gap-y-2 text-base">
            <a href="#contact" className="link-underline">
              Write to me
            </a>
            <a href="/resume.pdf" className="link-underline">
              Read the résumé
            </a>
          </p>
        </section>

        <section id="work" className="border-t border-border py-16 sm:py-20">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Selected work
          </h2>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-muted">
            A short shelf. Each piece is something I shaped myself, or nearly so.
          </p>

          <ul className="mt-12 flex flex-col">
            {projects.map((project) => (
              <li
                key={project.name}
                className="border-t border-border py-8 first:border-t-0 first:pt-0"
              >
                <h3 className="font-display text-xl font-medium text-ink">
                  {project.url ? (
                    <a href={project.url} className="link-underline">
                      {project.name}
                    </a>
                  ) : (
                    project.name
                  )}
                </h3>
                <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-muted">
                  {project.description}
                </p>
                {!project.url && (
                  <p className="mt-3 text-sm text-ink-faint">Link soon.</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section id="notes" className="border-t border-border py-16 sm:py-20">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            How I work
          </h2>
          <div className="mt-8 max-w-prose space-y-5 text-base leading-relaxed text-ink-muted">
            {stackLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <section id="contact" className="border-t border-border py-16 sm:py-24">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Let&apos;s talk
          </h2>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted">
            If something here resonates — a role, a collaboration, a question —
            send a note. I read everything that arrives.
          </p>
          <p className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-base">
            <a href="mailto:hello@harbi.eu" className="link-underline">
              hello@harbi.eu
            </a>
            <a
              href="https://github.com/axeltheredpanda"
              className="link-underline"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/yourusername"
              className="link-underline"
            >
              LinkedIn
            </a>
          </p>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-2xl px-6 pb-12 pt-4 sm:px-8">
        <p className="text-sm text-ink-faint">harbi.eu</p>
      </footer>
    </div>
  );
}

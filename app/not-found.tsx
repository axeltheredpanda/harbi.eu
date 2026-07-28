import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24 sm:px-8">
      <p className="font-mono text-sm tracking-wide text-accent">404</p>
      <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        Wrong turn on the stage notes.
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
        This page isn&apos;t on the route book. Recalculate and head back to
        the start.
      </p>
      <p className="mt-8">
        <Link href="/" className="link-underline text-base">
          Back to harbi.eu
        </Link>
      </p>
    </div>
  );
}

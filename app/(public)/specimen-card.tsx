import type { ReactNode } from "react";

type SpecimenCardProps = {
  number: string;
  name: string;
  stack: string[];
  years: string;
  note: string;
  description: string;
  catalogStatus: string;
  pipeline?: ReactNode;
};

export function SpecimenCard({
  number,
  name,
  stack,
  years,
  note,
  description,
  catalogStatus,
  pipeline,
}: SpecimenCardProps) {
  const meta = [`Stack - ${stack.join(", ")}`, years].join(" · ");

  return (
    <article className="py-10 first:pt-2">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-ink-faint uppercase">
        Nº {number}
      </p>

      <h3 className="mt-3 font-display text-xl font-medium text-ink">{name}</h3>

      <p className="mt-3 font-mono text-[0.65rem] leading-relaxed tracking-[0.14em] text-ink-faint uppercase">
        {meta}
      </p>

      <p className="mt-4 max-w-prose text-[0.95rem] leading-relaxed text-ink-muted italic">
        {note}
      </p>

      <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted">
        {description}
      </p>

      {pipeline}

      <p className="mt-5 font-mono text-[0.65rem] tracking-[0.12em] text-ink-faint uppercase">
        {catalogStatus}
      </p>
    </article>
  );
}

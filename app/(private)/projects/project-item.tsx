"use client";

import { useTransition } from "react";
import { deleteProject } from "@/backend/projects";
import type { Database } from "@/backend/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export function ProjectItem({ project }: { project: Project }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
      <div>
        <p className="text-sm font-medium text-ink">
          {project.url ? (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-strong"
            >
              {project.name}
            </a>
          ) : (
            project.name
          )}
        </p>
        {project.description && (
          <p className="text-sm text-ink-muted">{project.description}</p>
        )}
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteProject(project.id))}
        className="font-mono text-xs text-ink-faint hover:text-ink"
      >
        Delete
      </button>
    </li>
  );
}

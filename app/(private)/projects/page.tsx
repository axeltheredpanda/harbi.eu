import { getProjects, addProject } from "@/backend/projects";
import { buttonClass } from "@/frontend/components/button-variants";
import { ProjectItem } from "./project-item";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-sm text-accent">{"// projects"}</p>
        <h1 className="font-display text-2xl font-medium text-ink">Projects</h1>
      </div>

      <form action={addProject} className="flex flex-col gap-2">
        <input
          type="text"
          name="name"
          required
          placeholder="Project name"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <input
          type="text"
          name="description"
          placeholder="Description (optional)"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <input
          type="url"
          name="url"
          placeholder="URL (optional)"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <button type="submit" className={buttonClass("primary", "self-start")}>
          Add project
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {projects.map((project) => (
          <ProjectItem key={project.id} project={project} />
        ))}
        {projects.length === 0 && (
          <p className="font-mono text-sm text-ink-faint">No projects yet.</p>
        )}
      </ul>
    </div>
  );
}

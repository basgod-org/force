interface Project {
  id: number;
  name: string;
  description?: string;
  repo_path?: string;
  created_at: string;
  task_count: number;
}

interface ProjectRegistryProps {
  projects: Project[];
}

export function ProjectRegistry({ projects }: ProjectRegistryProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500 text-sm">
        No projects yet — POST to /api/projects to register one.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const date = new Date(project.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-zinc-100">{project.name}</div>
          {project.description && (
            <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{project.description}</div>
          )}
        </div>
        <div className="shrink-0 text-xs bg-zinc-800 text-zinc-300 rounded-full px-2.5 py-1 font-medium">
          {project.task_count} {project.task_count === 1 ? "task" : "tasks"}
        </div>
      </div>

      <div className="space-y-1.5">
        {project.repo_path && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="font-mono truncate">{project.repo_path}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {date}
        </div>
      </div>
    </div>
  );
}

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: number;
  name: string;
  description?: string;
  repo_path?: string;
  created_at: string;
  task_count: number;
}

export function ProjectRegistry({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
        No projects yet — POST to /api/projects to register one.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    <Card>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        {project.description && (
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        )}
        <CardAction>
          <Badge variant="secondary">
            {project.task_count} {project.task_count === 1 ? "task" : "tasks"}
          </Badge>
        </CardAction>
      </CardHeader>
      {project.repo_path && (
        <CardContent>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {project.repo_path}
          </p>
        </CardContent>
      )}
      <CardFooter>
        <p className="text-xs text-muted-foreground">{date}</p>
      </CardFooter>
    </Card>
  );
}

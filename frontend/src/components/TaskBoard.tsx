import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: number;
  title: string;
  description?: string;
  project_name?: string;
  assigned_agent?: string;
  status: string;
}

interface TaskBoardProps {
  pending: Task[];
  inProgress: Task[];
  done: Task[];
}

const COLUMNS = [
  { key: "pending" as const, label: "Pending" },
  { key: "in_progress" as const, label: "In Progress" },
  { key: "done" as const, label: "Done" },
];

export function TaskBoard({ pending, inProgress, done }: TaskBoardProps) {
  const columns = { pending, in_progress: inProgress, done };
  const total = pending.length + inProgress.length + done.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
        No tasks yet — create one via the Tasks page.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <Card key={col.key}>
          <CardHeader className="border-b">
            <CardTitle className="text-sm">{col.label}</CardTitle>
            <CardAction>
              <Badge variant="secondary">{columns[col.key].length}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 min-h-[80px]">
            {columns[col.key].length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Empty
              </p>
            ) : (
              columns[col.key].map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <Card size="sm" className="bg-secondary/50">
      <CardContent className="space-y-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {task.project_name && (
            <Badge variant="outline" className="text-xs">
              {task.project_name}
            </Badge>
          )}
          {task.assigned_agent && (
            <Badge variant="secondary" className="text-xs">
              @{task.assigned_agent}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

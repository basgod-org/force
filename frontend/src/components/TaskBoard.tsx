interface Task {
  id: number;
  title: string;
  description?: string;
  project_name?: string;
  assigned_agent?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TaskBoardProps {
  pending: Task[];
  inProgress: Task[];
  done: Task[];
}

const COLUMNS = [
  { key: "pending", label: "Pending", color: "text-amber-400", dot: "bg-amber-400" },
  { key: "in_progress", label: "In Progress", color: "text-indigo-400", dot: "bg-indigo-400 animate-pulse" },
  { key: "done", label: "Done", color: "text-emerald-400", dot: "bg-emerald-400" },
] as const;

export function TaskBoard({ pending, inProgress, done }: TaskBoardProps) {
  const columns = { pending, in_progress: inProgress, done };
  const total = pending.length + inProgress.length + done.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500 text-sm">
        No tasks yet — create one via the API to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <div key={col.key} className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className={`text-sm font-medium ${col.color}`}>{col.label}</span>
            </div>
            <span className="text-xs bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5">
              {columns[col.key].length}
            </span>
          </div>

          <div className="p-3 space-y-2 min-h-[120px]">
            {columns[col.key].length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-4">empty</div>
            ) : (
              columns[col.key].map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3 space-y-2 hover:border-zinc-600 transition-colors">
      <div className="text-sm text-zinc-200 font-medium leading-snug">{task.title}</div>

      {task.description && (
        <div className="text-xs text-zinc-500 line-clamp-2">{task.description}</div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {task.project_name && (
          <span className="text-xs bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
            {task.project_name}
          </span>
        )}
        {task.assigned_agent && (
          <span className="text-xs bg-indigo-950/60 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-800/40">
            @{task.assigned_agent}
          </span>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Task } from "@/lib/api";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export type { Task };

interface TaskBoardProps {
  pending: Task[];
  inProgress: Task[];
  done: Task[];
  onTaskClick?: (task: Task) => void;
  pageSize?: number;
}

const COLUMNS = [
  { key: "pending" as const,     label: "Pending",     accent: "from-amber-500 to-orange-500",  dot: "bg-amber-400",   count: "bg-amber-500/10 text-amber-400" },
  { key: "in_progress" as const, label: "In Progress", accent: "from-indigo-500 to-blue-500",   dot: "bg-indigo-400",  count: "bg-indigo-500/10 text-indigo-400" },
  { key: "done" as const,        label: "Done",        accent: "from-emerald-500 to-teal-500",  dot: "bg-emerald-400", count: "bg-emerald-500/10 text-emerald-400" },
];

export function TaskBoard({ pending, inProgress, done, onTaskClick, pageSize = 5 }: TaskBoardProps) {
  const columns = { pending, in_progress: inProgress, done };
  const total = pending.length + inProgress.length + done.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500 text-sm">
        No tasks yet — create one via the Tasks page.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <TaskColumn
          key={col.key}
          col={col}
          tasks={columns[col.key]}
          pageSize={pageSize}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}

function TaskColumn({
  col,
  tasks,
  pageSize,
  onTaskClick,
}: {
  col: (typeof COLUMNS)[number];
  tasks: Task[];
  pageSize: number;
  onTaskClick?: (task: Task) => void;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = tasks.slice(start, start + pageSize);

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/60">
      <div className={`h-[3px] bg-gradient-to-r ${col.accent}`} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${col.dot}`} />
            <span className="text-sm font-semibold text-zinc-200">{col.label}</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.count}`}>
            {tasks.length}
          </span>
        </div>
        <div className="space-y-2 min-h-[60px]">
          {visible.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-4">Empty</p>
          ) : (
            visible.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    text=""
                    onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-xs text-zinc-400 px-2">
                    {currentPage} / {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text=""
                    onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                    aria-disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  return (
    <div
      className={`rounded-lg border border-zinc-800 bg-zinc-800/40 p-3 space-y-1.5 ${
        onClick ? "cursor-pointer hover:bg-zinc-800/70 hover:border-zinc-700 transition-all" : ""
      }`}
      onClick={onClick}
    >
      <p className="text-sm font-medium text-zinc-200 leading-snug">{task.title}</p>
      {task.description && (
        <p className="text-xs text-zinc-500 line-clamp-2">{task.description}</p>
      )}
      <div className="flex flex-wrap gap-1 pt-0.5">
        {task.project_name && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-400 border border-zinc-700">
            {task.project_name}
          </span>
        )}
        {(task.agent_type || task.assigned_agent) && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            @{task.agent_type ?? task.assigned_agent}
          </span>
        )}
      </div>
    </div>
  );
}

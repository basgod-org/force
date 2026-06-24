"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TaskDrawer } from "@/components/TaskDrawer";
import { api, Task, Project, Agent } from "@/lib/api";

const PAGE_SIZE = 10;

const COLUMNS: { id: Task["status"]; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const STATUS_NEXT: Record<Task["status"], Task["status"] | null> = {
  pending: "in_progress",
  in_progress: "done",
  done: null,
};

export default function TasksPage() {
  return (
    <Suspense>
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [pages, setPages] = useState<Record<Task["status"], number>>({
    pending: 1,
    in_progress: 1,
    done: 1,
  });
  const searchParams = useSearchParams();
  const router = useRouter();

  const setPage = (status: Task["status"], page: number) =>
    setPages((prev) => ({ ...prev, [status]: page }));

  const load = async () => {
    const [t, p, a] = await Promise.all([api.tasks.list(), api.projects.list(), api.agents.list()]);
    setTasks(t);
    setProjects(p);
    setAgents(a);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-open task drawer when ?task=<id> is in the URL
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId || !tasks.length) return;
    const found = tasks.find((t) => t.id === parseInt(taskId, 10));
    if (found) setSelectedTask(found);
  }, [tasks, searchParams]);

  // Pre-filter by project from URL (?project=<id>)
  useEffect(() => {
    const pid = searchParams.get("project");
    if (pid) setFilterProject(pid);
  }, [searchParams]);

  const advance = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = STATUS_NEXT[task.status];
    if (!next) return;
    if (next === "done") {
      if (!window.confirm(`Move "${task.title}" to Done?`)) return;
    }
    const updated = await api.tasks.update(task.id, { status: next });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTask?.id === updated.id) setSelectedTask(updated);
  };

  const retry = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await api.tasks.update(task.id, { status: "pending" });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTask?.id === updated.id) setSelectedTask(updated);
  };

  const deleteTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    await api.tasks.delete(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (selectedTask?.id === task.id) setSelectedTask(null);
  };

  const filtered = tasks.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) return false;
    }
    if (filterAgent && (t.assigned_agent ?? t.agent_type) !== filterAgent) return false;
    if (filterProject && String(t.project_id) !== filterProject) return false;
    return true;
  });

  const allByStatus = (status: Task["status"]) => filtered.filter((t) => t.status === status);
  const pagedByStatus = (status: Task["status"]) => {
    const all = allByStatus(status);
    const pg = pages[status];
    const total = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    const current = Math.min(pg, total);
    return {
      items: all.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
      total: all.length,
      totalPages: total,
      currentPage: current,
    };
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Track what your agents are working on</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            + New Task
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <TaskForm
              projects={projects}
              agents={agents}
              onCreated={(t) => {
                setTasks((prev) => [t, ...prev]);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage("pending", 1); setPage("in_progress", 1); setPage("done", 1); }}
          className="w-56"
        />
        <Select value={filterAgent} onValueChange={(v) => setFilterAgent(v === "_all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All agents</SelectItem>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={(v) => setFilterProject(v === "_all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || filterAgent || filterProject) && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setFilterAgent(""); setFilterProject(""); }}>
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const { items, total, totalPages, currentPage } = pagedByStatus(col.id);
            return (
              <div key={col.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium">{col.label}</span>
                  <Badge variant="secondary" className="text-xs">{total}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onAdvance={(e) => advance(task, e)}
                      onRetry={(e) => retry(task, e)}
                      onDelete={(e) => deleteTask(task, e)}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="border border-dashed border-border rounded-md p-4 text-xs text-muted-foreground text-center">
                      No tasks
                    </div>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="mt-3">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => { e.preventDefault(); setPage(col.id, currentPage - 1); }}
                            aria-disabled={currentPage === 1}
                            className={currentPage === 1 ? "pointer-events-none opacity-40" : ""}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="text-xs text-muted-foreground px-2">
                            {currentPage} / {totalPages}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => { e.preventDefault(); setPage(col.id, currentPage + 1); }}
                            aria-disabled={currentPage === totalPages}
                            className={currentPage === totalPages ? "pointer-events-none opacity-40" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TaskDrawer
        task={selectedTask}
        onClose={() => {
          setSelectedTask(null);
          if (searchParams.get("task")) {
            router.replace("/tasks", { scroll: false });
          }
        }}
        onTaskUpdated={(updated) => setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))}
        onTaskDeleted={(id) => { setTasks((prev) => prev.filter((t) => t.id !== id)); setSelectedTask(null); }}
      />
    </div>
  );
}

function TaskCard({
  task,
  onAdvance,
  onRetry,
  onDelete,
  onClick,
}: {
  task: Task;
  onAdvance: (e: React.MouseEvent) => void;
  onRetry: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const next = STATUS_NEXT[task.status];
  return (
    <Card className="text-sm cursor-pointer hover:ring-1 hover:ring-indigo-500/40 transition-all" onClick={onClick}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium leading-snug">{task.title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {task.project_name && (
            <Badge variant="outline" className="text-xs">{task.project_name}</Badge>
          )}
          {task.assigned_agent && (
            <Badge variant="secondary" className="text-xs">@{task.assigned_agent}</Badge>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {next && (
            <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={onAdvance}>
              {next === "in_progress" ? "Start →" : "Done →"}
            </Button>
          )}
          {task.status === "in_progress" && (
            <Button size="sm" variant="ghost" className="text-xs h-7 text-amber-400 hover:text-amber-300" onClick={onRetry} title="Re-dispatch to pending">
              ↺ Retry
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-xs h-7 text-red-400 hover:text-red-300" onClick={onDelete}>
            ✕
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskForm({
  projects,
  agents,
  onCreated,
}: {
  projects: Project[];
  agents: Agent[];
  onCreated: (t: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [agent, setAgent] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const task = await api.tasks.create({
        title,
        description: description || undefined,
        project_id: projectId ? parseInt(projectId) : undefined,
        assigned_agent: agent || undefined,
      });
      onCreated(task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="desc">Description</Label>
        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label>Project</Label>
        <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Assign Agent</Label>
        <Select value={agent} onValueChange={(v) => setAgent(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name} — {a.role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !title.trim()}>
          {saving ? "Creating…" : "Create Task"}
        </Button>
      </div>
    </form>
  );
}

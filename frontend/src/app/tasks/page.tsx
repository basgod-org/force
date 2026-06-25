"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
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

const COLUMNS: { id: Task["status"]; label: string; accent: string; dot: string }[] = [
  { id: "pending",     label: "Pending",     accent: "from-amber-500 to-orange-500",  dot: "bg-amber-400" },
  { id: "in_progress", label: "In Progress", accent: "from-indigo-500 to-blue-500",   dot: "bg-indigo-400" },
  { id: "done",        label: "Done",        accent: "from-emerald-500 to-teal-500",  dot: "bg-emerald-400" },
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
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
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
      </motion.div>

      {/* Search & filter bar */}
      <motion.div
        className="flex flex-wrap gap-2 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage("pending", 1); setPage("in_progress", 1); setPage("done", 1); }}
          className="w-56"
        />
        <Select value={filterAgent} onValueChange={(v) => setFilterAgent(v === "_all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All agents">
              {(v: string) => v ? (agents.find((a) => a.id === v)?.name ?? "All agents") : "All agents"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All agents</SelectItem>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={(v) => setFilterProject(v === "_all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All projects">
              {(v: string) => v ? (projects.find((p) => String(p.id) === v)?.name ?? "All projects") : "All projects"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <AnimatePresence>
          {(search || filterAgent || filterProject) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setFilterAgent(""); setFilterProject(""); }}>
                Clear filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {loading ? (
        <motion.div
          className="text-muted-foreground text-sm"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading…
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col, colIdx) => {
            const { items, total, totalPages, currentPage } = pagedByStatus(col.id);
            return (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: colIdx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-sm font-medium">{col.label}</span>
                  <motion.div
                    key={total}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Badge variant="secondary" className="text-xs">{total}</Badge>
                  </motion.div>
                </div>
                <div className="flex flex-col gap-2">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((task, i) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -30, scale: 0.95 }}
                        transition={{
                          layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                          default: { duration: 0.3, delay: i * 0.04 },
                        }}
                      >
                        <TaskCard
                          task={task}
                          onAdvance={(e) => advance(task, e)}
                          onRetry={(e) => retry(task, e)}
                          onDelete={(e) => deleteTask(task, e)}
                          onClick={() => setSelectedTask(task)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {items.length === 0 && (
                    <motion.div
                      className="border border-dashed border-border rounded-md p-4 text-xs text-muted-foreground text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      No tasks
                    </motion.div>
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
              </motion.div>
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
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
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
              <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
                <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={onAdvance}>
                  {next === "in_progress" ? "Start →" : "Done →"}
                </Button>
              </motion.div>
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
    </motion.div>
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
      <AnimatePresence>
        {error && (
          <motion.div
            className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
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
            <SelectValue placeholder="Select project">
              {(v: string) => v ? (projects.find((p) => String(p.id) === v)?.name ?? "Select project") : "Select project"}
            </SelectValue>
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
            <SelectValue placeholder="Select agent">
              {(v: string) => {
                if (!v) return "Select agent";
                const a = agents.find((ag) => ag.id === v);
                return a ? `${a.name} — ${a.role}` : "Select agent";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name} — {a.role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? "Creating…" : "Create Task"}
          </Button>
        </motion.div>
      </div>
    </form>
  );
}

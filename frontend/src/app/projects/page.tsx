"use client";

import { useEffect, useState } from "react";
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
import { api, Project } from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects.list().then(setProjects).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Codebases your agents work on</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            + New Project
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <ProjectForm
              onCreated={(p) => {
                setProjects((prev) => [p, ...prev]);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
          No projects yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-border/70 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-sm">{project.name}</div>
          {project.description && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</div>
          )}
        </div>
        <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 shrink-0">
          {project.task_count} {project.task_count === 1 ? "task" : "tasks"}
        </span>
      </div>
      {project.repo_path && (
        <p className="text-xs text-muted-foreground font-mono truncate">{project.repo_path}</p>
      )}
    </div>
  );
}

function ProjectForm({ onCreated }: { onCreated: (p: Project) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const project = await api.projects.create({
        name,
        description: description || undefined,
        repo_path: repoPath || undefined,
      });
      onCreated(project);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="desc">Description</Label>
        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="repo">Repo Path</Label>
        <Input id="repo" value={repoPath} onChange={(e) => setRepoPath(e.target.value)} placeholder="/home/pruthvi/Projects/..." />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Creating…" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AgentGrid } from "@/components/AgentGrid";
import { TaskBoard } from "@/components/TaskBoard";
import { ProjectRegistry } from "@/components/ProjectRegistry";
import { TaskDrawer } from "@/components/TaskDrawer";
import { api, Agent, Task, Project } from "@/lib/api";

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const load = () =>
      Promise.all([api.agents.list(), api.tasks.list(), api.projects.list()]).then(
        ([a, t, p]) => { setAgents(a); setTasks(t); setProjects(p); }
      );
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const pending = tasks.filter((t) => t.status === "pending");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");
  const working = agents.filter((a) => a.status === "working").length;

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        {/* Hero header */}
        <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold gradient-text tracking-tight">
                  Command Center
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                  Monitor and coordinate your agent team
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <StatPill value={agents.length} label="agents" color="from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-300" />
                <StatPill value={working} label="working" color="from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-300" pulse={working > 0} />
                <StatPill value={tasks.length} label="tasks" color="from-sky-500/20 to-sky-500/5 border-sky-500/20 text-sky-300" />
                <StatPill value={projects.length} label="projects" color="from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-300" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">live</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
          <section>
            <SectionLabel icon="◈" color="text-violet-400">Agents</SectionLabel>
            <AgentGrid agents={agents} onTaskClick={setSelectedTask} />
          </section>

          <section>
            <SectionLabel icon="◉" color="text-sky-400">Task Board</SectionLabel>
            <TaskBoard pending={pending} inProgress={inProgress} done={done} onTaskClick={setSelectedTask} />
          </section>

          <section>
            <SectionLabel icon="◆" color="text-emerald-400">Projects</SectionLabel>
            <ProjectRegistry projects={projects} />
          </section>
        </main>
      </div>

      <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}

function SectionLabel({ children, icon, color }: { children: React.ReactNode; icon: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className={`text-xs ${color}`}>{icon}</span>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{children}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}

function StatPill({ value, label, color, pulse }: { value: number; label: string; color: string; pulse?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-br border ${color}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      <span className="text-sm font-bold">{value}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
}

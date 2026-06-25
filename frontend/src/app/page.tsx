"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AgentGrid } from "@/components/AgentGrid";
import { AgentHierarchy } from "@/components/AgentHierarchy";
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
        <motion.div
          className="border-b border-white/5 bg-white/[0.02] backdrop-blur-sm"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="text-2xl sm:text-3xl font-bold gradient-text tracking-tight">
                  Command Center
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                  Monitor and coordinate your agent team
                </p>
              </motion.div>

              <motion.div
                className="flex items-center gap-2 sm:gap-3 flex-wrap"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <StatPill value={agents.length} label="agents" color="from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-300" />
                <StatPill value={working} label="working" color="from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-300" pulse={working > 0} />
                <StatPill value={tasks.length} label="tasks" color="from-sky-500/20 to-sky-500/5 border-sky-500/20 text-sky-300" />
                <StatPill value={projects.length} label="projects" color="from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-300" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <span className="text-xs text-emerald-400 font-medium">live</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
          <PageSection delay={0.15} icon="⛓" color="text-amber-400" label="Team Hierarchy">
            <AgentHierarchy agents={agents} />
          </PageSection>

          <PageSection delay={0.25} icon="◈" color="text-violet-400" label="Agents">
            <AgentGrid agents={agents} onTaskClick={setSelectedTask} />
          </PageSection>

          <PageSection delay={0.35} icon="◉" color="text-sky-400" label="Task Board">
            <TaskBoard pending={pending} inProgress={inProgress} done={done} onTaskClick={setSelectedTask} />
          </PageSection>

          <PageSection delay={0.45} icon="◆" color="text-emerald-400" label="Projects">
            <ProjectRegistry projects={projects} />
          </PageSection>
        </main>
      </div>

      <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}

function PageSection({
  children,
  delay,
  icon,
  color,
  label,
}: {
  children: React.ReactNode;
  delay: number;
  icon: string;
  color: string;
  label: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <SectionLabel icon={icon} color={color}>{label}</SectionLabel>
      {children}
    </motion.section>
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
    <motion.div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-br border ${color}`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.15 }}
    >
      {pulse && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <motion.span
        className="text-sm font-bold"
        key={value}
        initial={{ scale: 1.3, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      >
        {value}
      </motion.span>
      <span className="text-xs opacity-70">{label}</span>
    </motion.div>
  );
}

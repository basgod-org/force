import { AgentGrid } from "@/components/AgentGrid";
import { TaskBoard } from "@/components/TaskBoard";
import { ProjectRegistry } from "@/components/ProjectRegistry";

export const dynamic = "force-dynamic";

async function getAgents() {
  try {
    const res = await fetch("http://localhost:8090/api/agents", {
      next: { revalidate: 10 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getTasks() {
  try {
    const res = await fetch("http://localhost:8090/api/tasks", {
      next: { revalidate: 10 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getProjects() {
  try {
    const res = await fetch("http://localhost:8090/api/projects", {
      next: { revalidate: 10 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Dashboard() {
  const [agents, tasks, projects] = await Promise.all([
    getAgents(),
    getTasks(),
    getProjects(),
  ]);

  const pending = tasks.filter((t: { status: string }) => t.status === "pending");
  const inProgress = tasks.filter((t: { status: string }) => t.status === "in_progress");
  const done = tasks.filter((t: { status: string }) => t.status === "done");

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Stats sub-header */}
      <div className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-zinc-100 leading-tight">
              Command Center
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5 hidden sm:block">
              Monitor your agent team
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <Stat label="agents" value={agents.length} />
            <Stat label="tasks" value={tasks.length} />
            <Stat label="projects" value={projects.length} />
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">live</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">
        <section>
          <SectionLabel>Agents</SectionLabel>
          <AgentGrid agents={agents} />
        </section>

        <section>
          <SectionLabel>Task Board</SectionLabel>
          <TaskBoard pending={pending} inProgress={inProgress} done={done} />
        </section>

        <section>
          <SectionLabel>Projects</SectionLabel>
          <ProjectRegistry projects={projects} />
        </section>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
      {children}
    </h2>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-sm font-semibold text-zinc-100">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

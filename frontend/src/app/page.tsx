import { AgentGrid } from "@/components/AgentGrid";
import { TaskBoard } from "@/components/TaskBoard";
import { ProjectRegistry } from "@/components/ProjectRegistry";
import { Header } from "@/components/Header";

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
      <Header agentCount={agents.length} taskCount={tasks.length} projectCount={projects.length} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Agents */}
        <section>
          <SectionLabel>Agents</SectionLabel>
          <AgentGrid agents={agents} />
        </section>

        {/* Task Board */}
        <section>
          <SectionLabel>Task Board</SectionLabel>
          <TaskBoard pending={pending} inProgress={inProgress} done={done} />
        </section>

        {/* Projects */}
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

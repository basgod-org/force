interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: "idle" | "working";
  current_task?: string;
}

interface AgentGridProps {
  agents: Agent[];
}

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
};

const ROLE_ICON: Record<string, string> = {
  "Full-Stack Developer": "💻",
  "Research Analyst": "🔍",
  "Internal Support": "🛟",
};

export function AgentGrid({ agents }: AgentGridProps) {
  if (agents.length === 0) {
    return <EmptyState message="No agents found — is the backend running?" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const isWorking = agent.status === "working";

  return (
    <div
      className={`
        rounded-xl border p-5 flex flex-col gap-4
        ${isWorking
          ? "border-indigo-500/40 bg-indigo-950/30"
          : "border-zinc-800 bg-zinc-900/60"
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{ROLE_ICON[agent.role] ?? "🤖"}</div>
          <div>
            <div className="font-semibold text-zinc-100">{agent.name}</div>
            <div className="text-xs text-zinc-500">{agent.role}</div>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Model</span>
          <span className="text-zinc-300 font-mono">
            {MODEL_LABEL[agent.model] ?? agent.model}
          </span>
        </div>
        {agent.current_task && (
          <div className="flex items-start justify-between text-xs gap-2">
            <span className="text-zinc-500 shrink-0">Task</span>
            <span className="text-zinc-300 text-right truncate">{agent.current_task}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isWorking = status === "working";
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium
        ${isWorking
          ? "bg-indigo-500/20 text-indigo-300"
          : "bg-zinc-800 text-zinc-400"
        }
      `}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isWorking ? "bg-indigo-400 animate-pulse" : "bg-zinc-500"}`}
      />
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500 text-sm">
      {message}
    </div>
  );
}

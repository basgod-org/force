"use client";

import { Agent } from "@/lib/api";

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
};

const AGENT_ACCENT: Record<string, { avatar: string; ring: string }> = {
  dev:        { avatar: "from-blue-600 to-indigo-600",   ring: "border-blue-500/30" },
  researcher: { avatar: "from-purple-600 to-violet-600", ring: "border-purple-500/30" },
  support:    { avatar: "from-orange-600 to-amber-600",  ring: "border-orange-500/30" },
};

const DEFAULT_ACCENT = { avatar: "from-indigo-600 to-violet-600", ring: "border-indigo-500/30" };

interface AgentHierarchyProps {
  agents: Agent[];
}

/**
 * Org-chart view of the team: the human boss at the top, the dispatcher
 * (orchestrator) below, and every worker agent reporting up to it.
 */
export function AgentHierarchy({ agents }: AgentHierarchyProps) {
  const working = agents.filter((a) => a.status === "working").length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
      <div className="flex flex-col items-center">
        {/* Boss */}
        <Node
          title="Pruthvi"
          subtitle="Boss · Owner"
          avatar="P"
          gradient="from-amber-500 to-yellow-500"
          ring="border-amber-500/40"
          glow
        />

        <Connector />

        {/* Orchestrator */}
        <Node
          title="Dispatcher"
          subtitle="Orchestrator · routes & assigns tasks"
          avatar="⚡"
          gradient="from-emerald-500 to-teal-500"
          ring="border-emerald-500/40"
          badge={working > 0 ? `${working} active` : "idle"}
        />

        {/* Branch down to the worker agents */}
        {agents.length > 0 && (
          <>
            <Connector />
            <div className="relative w-full">
              {/* horizontal rail joining the worker columns */}
              {agents.length > 1 && (
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div className="h-px bg-zinc-700" style={{ width: "calc(100% - 8rem)" }} />
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 pt-0">
                {agents.map((agent) => (
                  <WorkerNode key={agent.id} agent={agent} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Connector() {
  return <div className="w-px h-6 bg-zinc-700" />;
}

function Node({
  title,
  subtitle,
  avatar,
  gradient,
  ring,
  badge,
  glow,
}: {
  title: string;
  subtitle: string;
  avatar: string;
  gradient: string;
  ring: string;
  badge?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border ${ring} bg-zinc-900/80 px-4 py-3 ${
        glow ? "shadow-lg shadow-amber-500/10" : "shadow-md"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}
      >
        <span className="text-white font-bold text-base leading-none">{avatar}</span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-zinc-100 leading-tight">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
      {badge && (
        <span className="ml-2 shrink-0 rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
          {badge}
        </span>
      )}
    </div>
  );
}

function WorkerNode({ agent }: { agent: Agent }) {
  const isWorking = agent.status === "working";
  const accent = AGENT_ACCENT[agent.id] ?? DEFAULT_ACCENT;

  return (
    <div className="flex flex-col items-center">
      {/* stub connecting up to the horizontal rail */}
      <div className="w-px h-6 bg-zinc-700" />
      <div
        className={`flex flex-col items-center gap-2 w-36 rounded-xl border ${accent.ring} px-3 py-3 text-center transition-colors ${
          isWorking ? "bg-zinc-900/90" : "bg-zinc-900/50"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent.avatar} flex items-center justify-center shadow-lg`}
        >
          <span className="text-white font-bold text-base leading-none">
            {agent.name.slice(0, 1).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-zinc-100 truncate w-full">{agent.name}</p>
          <p className="text-[11px] text-zinc-500 leading-tight">{agent.role}</p>
        </div>
        <span className="font-mono text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
          {MODEL_LABEL[agent.model] ?? agent.model}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide ${
            isWorking ? "text-indigo-300" : "text-zinc-500"
          }`}
        >
          {isWorking && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
          {agent.status}
        </span>
      </div>
    </div>
  );
}

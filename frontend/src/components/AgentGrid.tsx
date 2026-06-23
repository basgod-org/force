"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AgentDrawer } from "@/components/AgentDrawer";
import { Agent, Task } from "@/lib/api";

export type { Agent };

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
};

const AGENT_ACCENT: Record<string, { bar: string; avatar: string; glow: string }> = {
  dev:        { bar: "from-blue-500 to-indigo-500",   avatar: "from-blue-600 to-indigo-600",   glow: "hover:shadow-blue-500/10" },
  researcher: { bar: "from-purple-500 to-violet-500", avatar: "from-purple-600 to-violet-600", glow: "hover:shadow-purple-500/10" },
  support:    { bar: "from-orange-500 to-amber-500",  avatar: "from-orange-600 to-amber-600",  glow: "hover:shadow-orange-500/10" },
};

const DEFAULT_ACCENT = { bar: "from-indigo-500 to-violet-500", avatar: "from-indigo-600 to-violet-600", glow: "hover:shadow-indigo-500/10" };

interface AgentGridProps {
  agents: Agent[];
  onTaskClick?: (task: Task) => void;
}

export function AgentGrid({ agents, onTaskClick }: AgentGridProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500 text-sm">
        No agents found — is the backend running?
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onClick={() => setSelectedAgent(agent)} />
        ))}
      </div>
      <AgentDrawer
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onTaskClick={(task) => { setSelectedAgent(null); onTaskClick?.(task); }}
      />
    </>
  );
}

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const isWorking = agent.status === "working";
  const accent = AGENT_ACCENT[agent.id] ?? DEFAULT_ACCENT;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl overflow-hidden cursor-pointer border transition-all duration-200 hover:shadow-lg ${accent.glow} ${
        isWorking
          ? "bg-zinc-900/80 border-indigo-500/30 shadow-md shadow-indigo-500/10"
          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Accent bar */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${accent.bar} ${isWorking ? "opacity-100" : "opacity-50"}`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent.avatar} flex items-center justify-center shrink-0 shadow-lg`}>
              <span className="text-white font-bold text-base leading-none">
                {agent.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-100 truncate">{agent.name}</p>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{agent.role}</p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={`shrink-0 ${isWorking ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30" : "bg-zinc-800 text-zinc-400"}`}
          >
            {isWorking && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse mr-1" />}
            {agent.status}
          </Badge>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Model</span>
            <span className="font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              {MODEL_LABEL[agent.model] ?? agent.model}
            </span>
          </div>
          {agent.current_task && (
            <div className="flex items-start justify-between text-xs gap-2">
              <span className="text-zinc-500 shrink-0">Working on</span>
              <span className="text-right text-zinc-300 truncate">{agent.current_task}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Tasks handled</span>
            <span className="text-zinc-300">
              <span className="font-semibold text-emerald-400">{agent.tasks_completed}</span>
              <span className="text-zinc-600"> / {agent.tasks_total} total</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

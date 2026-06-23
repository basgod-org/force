"use client";

import { Agent } from "@/lib/api";

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

const AGENT_ACCENT: Record<string, { avatar: string; glow: string; activeRing: string; idleRing: string; lineColor: string }> = {
  dev:        { avatar: "from-blue-600 to-indigo-600",   glow: "shadow-blue-500/30",   activeRing: "border-blue-400",    idleRing: "border-blue-500/30",   lineColor: "bg-blue-500" },
  researcher: { avatar: "from-purple-600 to-violet-600", glow: "shadow-purple-500/30", activeRing: "border-purple-400",  idleRing: "border-purple-500/30", lineColor: "bg-purple-500" },
  support:    { avatar: "from-orange-600 to-amber-600",  glow: "shadow-orange-500/30", activeRing: "border-orange-400",  idleRing: "border-orange-500/30", lineColor: "bg-orange-500" },
};

const DEFAULT_ACCENT = { avatar: "from-indigo-600 to-violet-600", glow: "shadow-indigo-500/30", activeRing: "border-indigo-400", idleRing: "border-indigo-500/30", lineColor: "bg-indigo-500" };

interface AgentHierarchyProps {
  agents: Agent[];
}

export function AgentHierarchy({ agents }: AgentHierarchyProps) {
  const anyWorking = agents.some((a) => a.status === "working");
  const workingCount = agents.filter((a) => a.status === "working").length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 overflow-x-auto">
      <div className="flex flex-col items-center min-w-[340px]">

        {/* Boss */}
        <HierarchyNode
          title="Pruthvi"
          subtitle="Boss · Owner"
          avatar="P"
          gradient="from-amber-500 to-yellow-500"
          ringClass="border-amber-400/60"
          glowClass="shadow-amber-500/20"
          connected
          pulsing={anyWorking}
        />

        <LiveConnector active={anyWorking} />

        {/* Dispatcher / Orchestrator */}
        <HierarchyNode
          title="Dispatcher"
          subtitle="Orchestrator · routes tasks"
          avatar="⚡"
          gradient="from-emerald-500 to-teal-500"
          ringClass={anyWorking ? "border-emerald-400" : "border-emerald-600/40"}
          glowClass="shadow-emerald-500/20"
          connected
          pulsing={anyWorking}
          badge={workingCount > 0 ? `${workingCount} active` : "idle"}
        />

        {agents.length > 0 && (
          <>
            <LiveConnector active={anyWorking} />

            {/* Horizontal rail */}
            <div className="relative w-full">
              <HorizontalRail agents={agents} />
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

function LiveConnector({ active }: { active: boolean }) {
  return (
    <div className="relative flex flex-col items-center w-px h-8 overflow-visible">
      {/* Base line */}
      <div className={`w-px h-full transition-colors duration-700 ${active ? "bg-emerald-500" : "bg-zinc-700"}`} />
      {/* Flowing dot */}
      {active && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)] animate-[flowDown_1.2s_ease-in-out_infinite]" />
      )}
    </div>
  );
}

function HorizontalRail({ agents }: { agents: Agent[] }) {
  if (agents.length <= 1) return null;
  const anyWorking = agents.some((a) => a.status === "working");
  return (
    <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
      <div
        className={`h-px transition-colors duration-700 ${anyWorking ? "bg-emerald-500/60" : "bg-zinc-700"}`}
        style={{ width: "calc(100% - 8rem)" }}
      />
    </div>
  );
}

function HierarchyNode({
  title,
  subtitle,
  avatar,
  gradient,
  ringClass,
  glowClass,
  connected,
  pulsing,
  badge,
}: {
  title: string;
  subtitle: string;
  avatar: string;
  gradient: string;
  ringClass: string;
  glowClass: string;
  connected?: boolean;
  pulsing?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border ${ringClass} bg-zinc-900/80 px-4 py-3 shadow-md ${connected ? glowClass : ""} transition-all duration-500`}
    >
      {/* Connection status dot */}
      <span
        className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-zinc-900 transition-colors duration-500 ${
          connected ? "bg-emerald-400" : "bg-zinc-600"
        } ${pulsing ? "animate-pulse" : ""}`}
      />

      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}>
        <span className="text-white font-bold text-base leading-none">{avatar}</span>
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-zinc-100 leading-tight">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>

      {badge && (
        <span className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide transition-colors duration-500 ${
          badge !== "idle"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-zinc-800 border-zinc-700 text-zinc-500"
        }`}>
          {badge !== "idle" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1 align-middle" />}
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
      {/* Vertical stub from rail */}
      <div className="relative flex flex-col items-center w-px h-7 overflow-visible">
        <div className={`w-px h-full transition-colors duration-700 ${isWorking ? accent.lineColor : "bg-zinc-700"}`} />
        {isWorking && (
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${accent.lineColor} shadow-sm animate-[flowDown_1s_ease-in-out_infinite]`} />
        )}
      </div>

      {/* Node card */}
      <div
        className={`relative flex flex-col items-center gap-2 w-36 rounded-xl border px-3 py-3 text-center transition-all duration-500 ${
          isWorking
            ? `${accent.activeRing} bg-zinc-900/90 shadow-lg ${accent.glow}`
            : `${accent.idleRing} bg-zinc-900/50`
        }`}
      >
        {/* Status dot */}
        <span
          className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-zinc-900 transition-colors duration-500 bg-emerald-400 ${
            isWorking ? "animate-pulse" : ""
          }`}
        />

        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent.avatar} flex items-center justify-center shadow-lg`}>
          <span className="text-white font-bold text-base leading-none">
            {agent.name.slice(0, 1).toUpperCase()}
          </span>
        </div>

        <div>
          <p className="font-semibold text-sm text-zinc-100">{agent.name}</p>
          <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">{agent.role}</p>
        </div>

        <span className="font-mono text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
          {MODEL_LABEL[agent.model] ?? agent.model}
        </span>

        <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium transition-colors duration-500 ${
          isWorking ? "text-emerald-400" : "text-zinc-500"
        }`}>
          {isWorking
            ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />working</>
            : <><span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />idle</>
          }
        </span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api, Agent, AgentStats, Task } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { MODEL_LABEL, STATUS_COLORS, AGENT_ACCENT } from "@/lib/config";

interface AgentDrawerProps {
  agent: Agent | null;
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

export function AgentDrawer({ agent, onClose, onTaskClick }: AgentDrawerProps) {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agent) { setStats(null); return; }
    setLoading(true);
    api.agents.stats(agent.id).then((s) => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, [agent?.id]);

  const isOpen = agent !== null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {agent && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${AGENT_ACCENT[agent.id]?.bubble ?? "bg-indigo-600"} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-semibold text-sm">{agent.name.slice(0, 1).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-zinc-100 text-sm">{agent.name}</p>
                  <p className="text-xs text-zinc-500">{agent.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">{MODEL_LABEL[agent.model] ?? agent.model}</Badge>
                <Badge className={agent.status === "working" ? "bg-indigo-600 text-white text-xs" : "bg-zinc-700 text-zinc-300 text-xs"}>
                  {agent.status === "working" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1" />}
                  {agent.status}
                </Badge>
                <button onClick={onClose} className="ml-2 text-zinc-400 hover:text-zinc-100 transition-colors text-lg leading-none">✕</button>
              </div>
            </div>

            <TasksPanel stats={stats} loading={loading} onTaskClick={onTaskClick} />
          </>
        )}
      </div>
    </>
  );
}

/* ── Tasks tab ── */
function TasksPanel({ stats, loading, onTaskClick }: { stats: AgentStats | null; loading: boolean; onTaskClick: (t: Task) => void }) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="px-5 py-4 border-b border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Task Stats</p>
        {loading ? (
          <div className="text-xs text-zinc-500">Loading…</div>
        ) : stats ? (
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Completed" value={stats.completed} color="text-emerald-400" />
            <StatCard label="In Progress" value={stats.in_progress} color="text-indigo-400" />
            <StatCard label="Pending" value={stats.pending} color="text-amber-400" />
          </div>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Recent Tasks</p>
        {loading ? (
          <div className="text-xs text-zinc-500">Loading…</div>
        ) : !stats?.recent_tasks.length ? (
          <p className="text-xs text-zinc-500 text-center py-8">No tasks assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.recent_tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-2.5 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-zinc-100 leading-snug group-hover:text-white">{task.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[task.status] ?? "bg-zinc-700 text-zinc-400"}`}>
                    {task.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{formatDate(task.updated_at)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api, Agent, AgentStats, Comment, Task } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const AGENT_ACCENT: Record<string, string> = {
  dev: "bg-blue-600",
  researcher: "bg-purple-600",
  support: "bg-orange-600",
};

interface AgentDrawerProps {
  agent: Agent | null;
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

type Tab = "tasks" | "chat";

export function AgentDrawer({ agent, onClose, onTaskClick }: AgentDrawerProps) {
  const [tab, setTab] = useState<Tab>("tasks");
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
                <div className={`w-9 h-9 rounded-xl ${AGENT_ACCENT[agent.id] ?? "bg-indigo-600"} flex items-center justify-center shrink-0`}>
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

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 shrink-0">
              {(["tasks", "chat"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                    tab === t ? "text-zinc-100 border-b-2 border-indigo-500" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t === "tasks" ? "Tasks" : "💬 Chat"}
                </button>
              ))}
            </div>

            {tab === "tasks" ? (
              <TasksPanel stats={stats} loading={loading} onTaskClick={onTaskClick} />
            ) : (
              <ChatPanel agent={agent} />
            )}
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

/* ── Chat tab ── */
function ChatPanel({ agent }: { agent: Agent }) {
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accentBg = AGENT_ACCENT[agent.id] ?? "bg-indigo-600";

  const pollComments = (taskId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const latest = await api.tasks.comments.list(taskId);
      setComments(latest);
      const lastIsAgent = latest.length > 0 && latest[latest.length - 1].author !== "user";
      if (lastIsAgent) setWaiting(false);
    }, 2000);
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setInput("");
    try {
      if (activeChatId === null) {
        const task = await api.agents.chat(agent.id, msg);
        setActiveChatId(task.id);
        const c = await api.tasks.comments.list(task.id);
        setComments(c);
        setWaiting(true);
        pollComments(task.id);
      } else {
        await api.agents.chatReply(agent.id, activeChatId, msg);
        const c = await api.tasks.comments.list(activeChatId);
        setComments(c);
        setWaiting(true);
      }
    } finally {
      setSending(false);
    }
  };

  const newChat = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setActiveChatId(null);
    setComments([]);
    setWaiting(false);
    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {comments.length === 0 && !waiting && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
            <div className={`w-12 h-12 rounded-2xl ${accentBg} flex items-center justify-center shadow-lg`}>
              <span className="text-white font-bold text-xl">{agent.name.slice(0, 1)}</span>
            </div>
            <p className="text-sm font-medium text-zinc-300">Chat with {agent.name}</p>
            <p className="text-xs text-zinc-500 max-w-[220px]">Ask anything — {agent.name} is a live agent and will respond directly.</p>
          </div>
        )}

        {comments.map((c) => {
          const isUser = c.author === "user";
          return (
            <div key={c.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
              {!isUser && (
                <div className={`w-7 h-7 rounded-lg ${accentBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className="text-white font-bold text-xs">{agent.name.slice(0, 1)}</span>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-bl-sm"
                }`}
              >
                {c.body}
              </div>
            </div>
          );
        })}

        {waiting && (
          <div className="flex justify-start gap-2">
            <div className={`w-7 h-7 rounded-lg ${accentBg} flex items-center justify-center shrink-0`}>
              <span className="text-white font-bold text-xs">{agent.name.slice(0, 1)}</span>
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 border-t border-zinc-800 shrink-0">
        {activeChatId !== null && (
          <div className="flex justify-end mb-2">
            <button onClick={newChat} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              + New chat
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Message ${agent.name}…`}
            rows={1}
            className="flex-1 resize-none bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors max-h-32"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
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

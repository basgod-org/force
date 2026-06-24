"use client";

import { useEffect, useRef, useState } from "react";
import { api, Agent, DirectChatMessage } from "@/lib/api";

const AGENT_ACCENT: Record<string, { gradient: string; bubble: string }> = {
  dev:        { gradient: "from-blue-600 to-indigo-600",   bubble: "bg-blue-600" },
  researcher: { gradient: "from-purple-600 to-violet-600", bubble: "bg-purple-600" },
  support:    { gradient: "from-orange-600 to-amber-600",  bubble: "bg-orange-600" },
};
const DEFAULT_ACCENT = { gradient: "from-indigo-600 to-violet-600", bubble: "bg-indigo-600" };

interface AgentChatProps {
  agent: Agent;
  onClose: () => void;
}

export function AgentChat({ agent, onClose }: AgentChatProps) {
  const accent = AGENT_ACCENT[agent.id] ?? DEFAULT_ACCENT;
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waiting]);

  const startPolling = (agentId: string, sid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const latest = await api.agents.direct.messages(agentId, sid);
      setMessages(latest);
      const lastIsAgent = latest.length > 0 && latest[latest.length - 1].author !== "user";
      if (lastIsAgent) setWaiting(false);
    }, 2000);
  };

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setInput("");
    try {
      if (!sessionId) {
        const msgs = await api.agents.direct.start(agent.id, msg);
        const sid = msgs[0].session_id;
        setSessionId(sid);
        setMessages(msgs);
        setWaiting(true);
        startPolling(agent.id, sid);
      } else {
        const userMsg = await api.agents.direct.send(agent.id, sessionId, msg);
        setMessages((prev) => [...prev, userMsg]);
        setWaiting(true);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] h-[520px] rounded-2xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${accent.gradient} shrink-0`}>
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">{agent.name.slice(0, 1).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">{agent.name}</p>
          <p className="text-white/60 text-xs">{agent.role}</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/70 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !waiting && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-lg`}>
              <span className="text-white font-bold text-xl">{agent.name.slice(0, 1)}</span>
            </div>
            <p className="text-sm font-medium text-zinc-300">Chat with {agent.name}</p>
            <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">
              Direct line to {agent.name}. Ask anything.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.author === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2 items-end`}>
              {!isUser && (
                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${accent.gradient} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold text-[10px]">{agent.name.slice(0, 1)}</span>
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-zinc-800/80 text-zinc-100 border border-zinc-700/50 rounded-bl-sm"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}

        {waiting && (
          <div className="flex justify-start gap-2 items-end">
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${accent.gradient} flex items-center justify-center shrink-0`}>
              <span className="text-white font-bold text-[10px]">{agent.name.slice(0, 1)}</span>
            </div>
            <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-zinc-800 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Message ${agent.name}…`}
            rows={1}
            className="flex-1 resize-none bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 transition-colors max-h-28"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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

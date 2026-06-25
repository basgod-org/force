"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { AgentDrawer } from "@/components/AgentDrawer";
import { AgentChat } from "@/components/AgentChat";
import { Agent, Task } from "@/lib/api";
import { AGENT_ACCENT, DEFAULT_AGENT_ACCENT, MODEL_LABEL } from "@/lib/config";

export type { Agent };

interface AgentGridProps {
  agents: Agent[];
  onTaskClick?: (task: Task) => void;
}

export function AgentGrid({ agents, onTaskClick }: AgentGridProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);

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
        {agents.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            index={i}
            onClick={() => setSelectedAgent(agent)}
            onChat={(e) => { e.stopPropagation(); setChatAgentId(agent.id); }}
          />
        ))}
      </div>

      <AgentDrawer
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onTaskClick={(task) => { setSelectedAgent(null); onTaskClick?.(task); }}
      />

      {/* Keep all chat instances mounted so history survives close/reopen */}
      {agents.map((agent) => (
        <AgentChat
          key={agent.id}
          agent={agent}
          visible={chatAgentId === agent.id}
          onClose={() => setChatAgentId(null)}
        />
      ))}
    </>
  );
}

function AgentCard({
  agent,
  index,
  onClick,
  onChat,
}: {
  agent: Agent;
  index: number;
  onClick: () => void;
  onChat: (e: React.MouseEvent) => void;
}) {
  const isWorking = agent.status === "working";
  const accent = AGENT_ACCENT[agent.id] ?? DEFAULT_AGENT_ACCENT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: "easeOut" } }}
      onClick={onClick}
      className={`relative rounded-xl overflow-hidden cursor-pointer border ${accent.glow} ${
        isWorking
          ? "bg-zinc-900/80 border-indigo-500/30 shadow-md shadow-indigo-500/10"
          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
      }`}
      style={{ transition: "border-color 0.3s, background-color 0.3s" }}
    >
      {/* Accent bar */}
      <motion.div
        className={`h-[3px] w-full bg-gradient-to-r ${accent.bar}`}
        animate={{ opacity: isWorking ? 1 : 0.5 }}
        transition={{ duration: 0.4 }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent.avatar} flex items-center justify-center shrink-0 shadow-lg`}
              animate={isWorking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={isWorking ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : {}}
            >
              <span className="text-white font-bold text-base leading-none">
                {agent.name.slice(0, 1).toUpperCase()}
              </span>
            </motion.div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-100 truncate">{agent.name}</p>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{agent.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Chat bubble button */}
            <motion.button
              onClick={onChat}
              className={`w-7 h-7 rounded-lg bg-zinc-800 ${accent.chat} border border-zinc-700 hover:border-transparent flex items-center justify-center group`}
              title={`Chat with ${agent.name}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.15 }}
            >
              <svg className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </motion.button>
            <motion.div
              animate={isWorking
                ? { backgroundColor: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.3)" }
                : { backgroundColor: "rgba(39,39,42,1)", borderColor: "rgba(63,63,70,1)" }
              }
              transition={{ duration: 0.4 }}
            >
              <Badge
                variant="secondary"
                className={`${isWorking ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30" : "bg-zinc-800 text-zinc-400"}`}
              >
                <AnimatePresence mode="wait">
                  {isWorking && (
                    <motion.span
                      key="pulse"
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse mr-1"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </AnimatePresence>
                <motion.span
                  key={agent.status}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {agent.status}
                </motion.span>
              </Badge>
            </motion.div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Model</span>
            <span className="font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              {MODEL_LABEL[agent.model] ?? agent.model}
            </span>
          </div>
          <AnimatePresence>
            {agent.current_task && (
              <motion.div
                className="flex items-start justify-between text-xs gap-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-zinc-500 shrink-0">Working on</span>
                <span className="text-right text-zinc-300 truncate">{agent.current_task}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Tasks handled</span>
            <span className="text-zinc-300">
              <span className="font-semibold text-emerald-400">{agent.tasks_completed}</span>
              <span className="text-zinc-600"> / {agent.tasks_total} total</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

"use client";

import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useRef } from "react";
import { Agent } from "@/lib/api";

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

const AGENT_ACCENT: Record<string, { avatar: string; glow: string; activeRing: string; idleRing: string; lineColor: string; glowRgb: string }> = {
  dev:        { avatar: "from-blue-600 to-indigo-600",   glow: "shadow-blue-500/30",   activeRing: "border-blue-400",    idleRing: "border-blue-500/30",   lineColor: "bg-blue-500",    glowRgb: "59,130,246" },
  researcher: { avatar: "from-purple-600 to-violet-600", glow: "shadow-purple-500/30", activeRing: "border-purple-400",  idleRing: "border-purple-500/30", lineColor: "bg-purple-500",  glowRgb: "168,85,247" },
  support:    { avatar: "from-orange-600 to-amber-600",  glow: "shadow-orange-500/30", activeRing: "border-orange-400",  idleRing: "border-orange-500/30", lineColor: "bg-orange-500",  glowRgb: "249,115,22" },
};

const DEFAULT_ACCENT = { avatar: "from-indigo-600 to-violet-600", glow: "shadow-indigo-500/30", activeRing: "border-indigo-400", idleRing: "border-indigo-500/30", lineColor: "bg-indigo-500", glowRgb: "99,102,241" };

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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
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
        </motion.div>

        <BossConnector active={anyWorking} delay={0.3} />

        {/* Dispatcher */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
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
        </motion.div>

        <AnimatePresence>
          {agents.length > 0 && (
            <motion.div
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <AnimatedConnector active={anyWorking} delay={0.55} />

              {/* Horizontal rail */}
              <div className="relative w-full">
                <HorizontalRail agents={agents} />
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 pt-0">
                  {agents.map((agent, i) => (
                    <WorkerNode key={agent.id} agent={agent} index={i} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BossConnector({ active, delay = 0 }: { active: boolean; delay?: number }) {
  return (
    <div className="relative flex flex-col items-center w-px h-8 overflow-visible">
      <svg
        className="absolute top-0 left-1/2 -translate-x-1/2 overflow-visible"
        width="3"
        height="32"
        style={{ display: "block" }}
      >
        {/* Subtle amber glow behind the line */}
        {active && (
          <motion.line
            x1="1.5" y1="0" x2="1.5" y2="32"
            stroke="rgb(251,191,36)"
            strokeWidth="4"
            strokeOpacity={0}
            animate={{ strokeOpacity: [0, 0.15, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.line
          x1="1.5" y1="0" x2="1.5" y2="32"
          stroke={active ? "rgb(251,191,36)" : "rgb(120,90,30)"}
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1, stroke: active ? "rgb(251,191,36)" : "rgb(120,90,30)" }}
          transition={{ duration: 0.6, delay, ease: "easeOut", stroke: { duration: 0.5 } }}
        />
      </svg>

      {/* Flowing amber dot — source of authority */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{
              background: "rgb(251,191,36)",
              boxShadow: "0 0 8px 3px rgba(251,191,36,0.5)",
              top: 0,
            }}
            initial={{ top: 0, opacity: 0.9 }}
            animate={{ top: 28, opacity: [0.9, 1, 0.7] }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              ease: "easeIn",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AnimatedConnector({ active, delay = 0 }: { active: boolean; delay?: number }) {
  const pathLength = useMotionValue(0);

  useEffect(() => {
    const controls = animate(pathLength, 1, {
      duration: 0.6,
      delay,
      ease: "easeOut",
    });
    return controls.stop;
  }, []);

  return (
    <div className="relative flex flex-col items-center w-px h-8 overflow-visible">
      {/* Drawn-in base line using svg */}
      <svg
        className="absolute top-0 left-1/2 -translate-x-1/2 overflow-visible"
        width="2"
        height="32"
        style={{ display: "block" }}
      >
        <motion.line
          x1="1" y1="0" x2="1" y2="32"
          stroke={active ? "rgb(52,211,153)" : "rgb(63,63,70)"}
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1, stroke: active ? "rgb(52,211,153)" : "rgb(63,63,70)" }}
          transition={{ duration: 0.6, delay, ease: "easeOut", stroke: { duration: 0.5 } }}
        />
      </svg>

      {/* Flowing dot */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ boxShadow: "0 0 6px 2px rgba(52,211,153,0.6)", top: 0 }}
            initial={{ top: 0 }}
            animate={{ top: 28 }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function HorizontalRail({ agents }: { agents: Agent[] }) {
  if (agents.length <= 1) return null;
  const anyWorking = agents.some((a) => a.status === "working");
  return (
    <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
      <motion.div
        className="h-px"
        initial={{ scaleX: 0, backgroundColor: "rgb(63,63,70)" }}
        animate={{
          scaleX: 1,
          backgroundColor: anyWorking ? "rgba(52,211,153,0.6)" : "rgb(63,63,70)",
        }}
        transition={{ duration: 0.7, delay: 0.7, ease: "easeOut", backgroundColor: { duration: 0.5 } }}
        style={{ transformOrigin: "center", width: "calc(100% - 8rem)" }}
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
    <motion.div
      className={`relative flex items-center gap-3 rounded-xl border ${ringClass} bg-zinc-900/80 px-4 py-3 shadow-md ${connected ? glowClass : ""}`}
      animate={{
        boxShadow: pulsing
          ? ["0 0 0 0 rgba(52,211,153,0)", "0 0 16px 4px rgba(52,211,153,0.15)", "0 0 0 0 rgba(52,211,153,0)"]
          : "none",
      }}
      transition={pulsing ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5 }}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}>
        <span className="text-white font-bold text-base leading-none">{avatar}</span>
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-zinc-100 leading-tight">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>

      {badge && (
        <motion.span
          className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            badge !== "idle"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-800 border-zinc-700 text-zinc-500"
          }`}
          animate={{ opacity: [1, 0.7, 1] }}
          transition={badge !== "idle" ? { duration: 2, repeat: Infinity } : {}}
        >
          {badge !== "idle" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1 align-middle" />}
          {badge}
        </motion.span>
      )}
    </motion.div>
  );
}

function WorkerNode({ agent, index }: { agent: Agent; index: number }) {
  const isWorking = agent.status === "working";
  const accent = AGENT_ACCENT[agent.id] ?? DEFAULT_ACCENT;

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Vertical stub from rail */}
      <div className="relative flex flex-col items-center w-px h-7 overflow-visible">
        <svg className="absolute top-0 left-1/2 -translate-x-1/2" width="2" height="28">
          <motion.line
            x1="1" y1="0" x2="1" y2="28"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{
              pathLength: 1,
              stroke: isWorking ? `rgb(${accent.glowRgb})` : "rgb(63,63,70)",
            }}
            transition={{ duration: 0.5, delay: 0.8 + index * 0.1, stroke: { duration: 0.4 } }}
          />
        </svg>
        <AnimatePresence>
          {isWorking && (
            <motion.div
              className={`absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${accent.lineColor}`}
              style={{ boxShadow: `0 0 4px rgba(${accent.glowRgb},0.5)`, top: 0 }}
              initial={{ top: 0 }}
              animate={{ top: 24 }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Node card */}
      <motion.div
        className={`relative flex flex-col items-center gap-2 w-36 rounded-xl border px-3 py-3 text-center ${
          isWorking
            ? `${accent.activeRing} bg-zinc-900/90 shadow-lg ${accent.glow}`
            : `${accent.idleRing} bg-zinc-900/50`
        }`}
        animate={{
          boxShadow: isWorking
            ? [
                `0 0 0 0 rgba(${accent.glowRgb},0)`,
                `0 0 20px 4px rgba(${accent.glowRgb},0.2)`,
                `0 0 0 0 rgba(${accent.glowRgb},0)`,
              ]
            : "none",
        }}
        transition={isWorking ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
        whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      >
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

        <motion.span
          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium ${
            isWorking ? "text-emerald-400" : "text-zinc-500"
          }`}
          animate={{ opacity: isWorking ? [1, 0.6, 1] : 1 }}
          transition={isWorking ? { duration: 1.8, repeat: Infinity } : {}}
        >
          {isWorking
            ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />working</>
            : <><span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />idle</>
          }
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

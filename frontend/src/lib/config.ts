export const AGENT_ACCENT: Record<string, { bar: string; avatar: string; glow: string; chat: string; bubble: string; gradient: string }> = {
  dev:        { bar: "from-blue-500 to-indigo-500",   avatar: "from-blue-600 to-indigo-600",   glow: "hover:shadow-blue-500/10",   chat: "hover:bg-blue-600",   bubble: "bg-blue-600",   gradient: "from-blue-600 to-indigo-600" },
  researcher: { bar: "from-purple-500 to-violet-500", avatar: "from-purple-600 to-violet-600", glow: "hover:shadow-purple-500/10", chat: "hover:bg-purple-600", bubble: "bg-purple-600", gradient: "from-purple-600 to-violet-600" },
  support:    { bar: "from-orange-500 to-amber-500",  avatar: "from-orange-600 to-amber-600",  glow: "hover:shadow-orange-500/10", chat: "hover:bg-orange-600", bubble: "bg-orange-600", gradient: "from-orange-600 to-amber-600" },
};

export const DEFAULT_AGENT_ACCENT = {
  bar: "from-indigo-500 to-violet-500", avatar: "from-indigo-600 to-violet-600",
  glow: "hover:shadow-indigo-500/10", chat: "hover:bg-indigo-600",
  bubble: "bg-indigo-600", gradient: "from-indigo-600 to-violet-600",
};

export const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export const AGENT_COLORS: Record<string, string> = {
  dev: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  researcher: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  support: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

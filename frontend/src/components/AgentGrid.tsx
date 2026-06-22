import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: "idle" | "working";
  current_task?: string;
}

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
};

const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-teal-600",
  "bg-cyan-600",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AgentGrid({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
        No agents found — is the backend running?
      </div>
    );
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
    <Card className={isWorking ? "ring-indigo-500/40" : ""}>
      <CardHeader>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl ${getAvatarColor(agent.name)} flex items-center justify-center shrink-0`}
          >
            <span className="text-white font-semibold text-base leading-none">
              {agent.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{agent.name}</CardTitle>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {agent.role}
            </p>
          </div>
        </div>
        <CardAction>
          <Badge
            variant={isWorking ? "default" : "secondary"}
            className={isWorking ? "bg-indigo-600 text-white" : ""}
          >
            {isWorking && (
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
            )}
            {agent.status}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Model</span>
          <Badge variant="outline" className="font-mono">
            {MODEL_LABEL[agent.model] ?? agent.model}
          </Badge>
        </div>
        {agent.current_task && (
          <div className="flex items-start justify-between text-xs gap-2">
            <span className="text-muted-foreground shrink-0">Task</span>
            <span className="text-right truncate">{agent.current_task}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

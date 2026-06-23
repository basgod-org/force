"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, Comment, Task, TaskEvent } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
};

const AGENT_COLORS: Record<string, string> = {
  dev: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  researcher: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  support: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

type TimelineItem =
  | { kind: "comment"; ts: string; data: Comment }
  | { kind: "event"; ts: string; data: TaskEvent };

function mergeTimeline(comments: Comment[], events: TaskEvent[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...comments.map((c) => ({ kind: "comment" as const, ts: c.created_at, data: c })),
    ...events.map((e) => ({ kind: "event" as const, ts: e.created_at, data: e })),
  ];
  return items.sort((a, b) => a.ts.localeCompare(b.ts));
}

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
}

export function TaskDrawer({ task, onClose }: TaskDrawerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = async (taskId: number) => {
    try {
      const [c, e] = await Promise.all([
        api.tasks.comments.list(taskId),
        api.tasks.events.list(taskId),
      ]);
      setComments(c);
      setEvents(e);
    } catch {
      // silently ignore poll errors
    }
  };

  useEffect(() => {
    if (!task) {
      setComments([]);
      setEvents([]);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    fetchAll(task.id);
    pollRef.current = setInterval(() => fetchAll(task.id), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [task?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length, events.length]);

  const submit = async () => {
    if (!task || !reply.trim()) return;
    setSending(true);
    try {
      const userComment = await api.tasks.comments.create(task.id, {
        author: "user",
        body: reply.trim(),
      });
      setComments((prev) => [...prev, userComment]);
      setReply("");

      const timeline = mergeTimeline([...comments, userComment], events);
      const contextBody = [
        `Task: ${task.title}`,
        task.description ? `Description: ${task.description}` : null,
        `Status: ${task.status}`,
        task.project_name ? `Project: ${task.project_name}` : null,
        "",
        "Timeline:",
        ...timeline.map((item) =>
          item.kind === "comment"
            ? `[${item.data.author}] ${item.data.body}`
            : `[system] Status changed: ${item.data.from_status ?? "?"} → ${item.data.to_status}${item.data.actor ? ` by ${item.data.actor}` : ""}`
        ),
        "",
        `The user just said: "${reply.trim()}"`,
        "Please respond as the assigned agent.",
      ]
        .filter((l) => l !== null)
        .join("\n");

      const agentComment = await api.tasks.comments.create(task.id, {
        author: "agent-request",
        body: contextBody,
      });
      setComments((prev) => [...prev, agentComment]);
    } finally {
      setSending(false);
    }
  };

  const isOpen = task !== null;
  const timeline = mergeTimeline(comments, events);
  const workedBy = task?.agent_type || task?.assigned_agent;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[520px] bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {task && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-100 text-sm leading-snug">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors text-lg leading-none shrink-0 mt-0.5"
                >
                  ✕
                </button>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${
                    STATUS_COLORS[task.status] ?? "bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {task.status.replace("_", " ")}
                </span>
                {task.project_name && (
                  <Badge variant="outline" className="text-xs">
                    {task.project_name}
                  </Badge>
                )}
                {workedBy && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${
                      AGENT_COLORS[workedBy] ?? "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    @{workedBy}
                  </span>
                )}
              </div>

              {/* Trace info */}
              {task.session_id && (
                <p className="text-xs text-zinc-600 mt-2 font-mono truncate">
                  session: {task.session_id}
                </p>
              )}

              <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
                <span>Updated {new Date(task.updated_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                Timeline
              </p>

              {/* Task created marker */}
              <EventMarker
                label="Task created"
                time={task.created_at}
                icon="✦"
                color="text-zinc-500"
              />

              {timeline.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">
                  No activity yet.
                </p>
              ) : (
                timeline.map((item) =>
                  item.kind === "comment" ? (
                    <CommentBubble key={`c-${item.data.id}`} comment={item.data} />
                  ) : (
                    <EventRow key={`e-${item.data.id}`} event={item.data} />
                  )
                )
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            <div className="px-5 py-4 border-t border-zinc-800">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                }}
                placeholder="Reply to agent… (⌘Enter to send)"
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  disabled={!reply.trim() || sending}
                  onClick={submit}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                >
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function EventMarker({
  label,
  time,
  icon,
  color,
}: {
  label: string;
  time: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`text-xs ${color}`}>{icon}</span>
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="flex-1 border-t border-zinc-800" />
      <span className="text-xs text-zinc-600">
        {new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

function EventRow({ event }: { event: TaskEvent }) {
  const label = event.note
    ? event.note
    : `${event.from_status ?? "?"} → ${event.to_status}`;

  const actor = event.actor;

  return (
    <div className="flex items-center gap-2 py-1 my-1">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0 ml-0.5" />
      <span className="text-xs text-zinc-400">{label}</span>
      {actor && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded border ${
            AGENT_COLORS[actor] ?? "bg-zinc-700 text-zinc-400 border-zinc-600"
          }`}
        >
          @{actor}
        </span>
      )}
      <span className="flex-1" />
      <span className="text-xs text-zinc-600 shrink-0">
        {new Date(event.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

function CommentBubble({ comment }: { comment: Comment }) {
  const isUser = comment.author === "user";
  const isAgentRequest = comment.author === "agent-request";

  if (isAgentRequest) {
    return (
      <div className="text-xs text-zinc-600 italic text-center py-1">
        — agent notified —
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
          isUser
            ? "bg-indigo-600/20 border border-indigo-500/20 text-zinc-100"
            : "bg-zinc-800 border border-zinc-700 text-zinc-200"
        }`}
      >
        {!isUser && (
          <p
            className={`text-xs font-medium mb-1 ${
              AGENT_COLORS[comment.author]
                ? comment.author === "dev"
                  ? "text-blue-400"
                  : comment.author === "researcher"
                  ? "text-purple-400"
                  : "text-orange-400"
                : "text-zinc-400"
            }`}
          >
            @{comment.author}
          </p>
        )}
        <p className="leading-relaxed whitespace-pre-wrap">{comment.body}</p>
        <p className={`text-xs mt-1 ${isUser ? "text-indigo-400/70" : "text-zinc-500"}`}>
          {new Date(comment.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, Comment, Task, TaskEvent } from "@/lib/api";
import { Markdown } from "@/components/Markdown";
import { formatDate, formatTime } from "@/lib/utils";
import { STATUS_COLORS, AGENT_COLORS } from "@/lib/config";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
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
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (id: number) => void;
}

export function TaskDrawer({ task, onClose, onTaskUpdated, onTaskDeleted }: TaskDrawerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
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
      setEditing(false);
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

  const startEdit = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDesc(task.description ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!task) return;
    setSavingEdit(true);
    try {
      const updated = await api.tasks.update(task.id, {
        title: editTitle.trim() || task.title,
        description: editDesc || undefined,
      });
      onTaskUpdated?.(updated);
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  const retryTask = async () => {
    if (!task) return;
    const updated = await api.tasks.update(task.id, { status: "pending" });
    onTaskUpdated?.(updated);
  };

  const deleteTask = async () => {
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    await api.tasks.delete(task.id);
    onTaskDeleted?.(task.id);
    onClose();
  };

  const isOpen = task !== null;
  const timeline = mergeTimeline(comments, events);
  const workedBy = task?.agent_type || task?.assigned_agent;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            {task && (
              <>
                {/* Header */}
                <div className="px-5 py-4 border-b border-zinc-800">
                  <AnimatePresence mode="wait">
                    {editing ? (
                      <motion.div
                        key="edit"
                        className="space-y-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-sm font-semibold"
                          placeholder="Task title"
                        />
                        <Textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="text-xs resize-none"
                          placeholder="Description (optional)"
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                          <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                            {savingEdit ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="view"
                        className="flex items-start justify-between gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
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
                        <div className="flex items-center gap-1 shrink-0">
                          <motion.button
                            onClick={startEdit}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-zinc-800"
                            title="Edit task"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            ✎
                          </motion.button>
                          <motion.button
                            onClick={deleteTask}
                            className="text-zinc-500 hover:text-red-400 transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-zinc-800"
                            title="Delete task"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            ✕
                          </motion.button>
                          <motion.button
                            onClick={onClose}
                            className="text-zinc-400 hover:text-zinc-100 transition-colors text-lg leading-none ml-1"
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                          >
                            ✕
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Meta badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3 items-center">
                    <StatusBadge status={task.status} />
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
                    {task.status === "in_progress" && (
                      <motion.button
                        onClick={retryTask}
                        className="text-xs px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                        title="Reset to pending for re-dispatch"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ↺ Retry
                      </motion.button>
                    )}
                  </div>

                  {/* Trace info */}
                  {task.session_id && (
                    <p className="text-xs text-zinc-600 mt-2 font-mono truncate">
                      session: {task.session_id}
                    </p>
                  )}

                  <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                    <span>Created {formatDate(task.created_at)}</span>
                    <span>Updated {formatDate(task.updated_at)}</span>
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
                    <AnimatePresence initial={false}>
                      {timeline.map((item, i) =>
                        item.kind === "comment" ? (
                          <motion.div
                            key={`c-${item.data.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i < 5 ? 0 : 0 }}
                          >
                            <CommentBubble comment={item.data} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key={`e-${item.data.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25 }}
                          >
                            <EventRow event={item.data} />
                          </motion.div>
                        )
                      )}
                    </AnimatePresence>
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
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      <Button
                        size="sm"
                        disabled={!reply.trim() || sending}
                        onClick={submit}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                      >
                        {sending ? "Sending…" : "Send"}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatusBadge({ status }: { status: string }) {
  const STATUS_ORDER = ["pending", "in_progress", "done"];
  const colorMap: Record<string, string> = {
    pending: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    in_progress: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
    done: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  };

  return (
    <motion.span
      key={status}
      className={`text-xs px-2 py-0.5 rounded border ${colorMap[status] ?? "bg-zinc-700 text-zinc-400"}`}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {status.replace("_", " ")}
    </motion.span>
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
        {formatTime(time)}
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
        {formatTime(event.created_at)}
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
              comment.author === "dev"
                ? "text-blue-400"
                : comment.author === "researcher"
                ? "text-purple-400"
                : comment.author === "support"
                ? "text-orange-400"
                : "text-zinc-400"
            }`}
          >
            @{comment.author}
          </p>
        )}
        <Markdown>{comment.body}</Markdown>
        <p className={`text-xs mt-1 ${isUser ? "text-indigo-400/70" : "text-zinc-500"}`}>
          {formatTime(comment.created_at)}
        </p>
      </div>
    </div>
  );
}

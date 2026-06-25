"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, DirectChatMessage } from "@/lib/api";

const AGENT_ID = "support";
const USER_ID = "boss";
const DISPATCH_TIMEOUT_MS = 120_000; // 2 minutes

interface SupportChatProps {
  visible: boolean;
  onClose: () => void;
}

export function SupportChat({ visible, onClose }: SupportChatProps) {
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const resumedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const clearWaitTimers = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  // Resume most recent "boss" session (or start fresh) the first time the panel opens.
  // resumedRef + state both live in this always-mounted component, so opening/closing
  // the Sheet never re-fetches or resets the conversation.
  useEffect(() => {
    if (!visible || resumedRef.current) return;
    resumedRef.current = true;
    setLoading(true);
    (async () => {
      try {
        const sessions = await api.agents.sessions(AGENT_ID, USER_ID);
        if (sessions.length > 0) {
          const sid = sessions[0].session_id;
          const msgs = await api.agents.direct.messages(AGENT_ID, sid);
          setSessionId(sid);
          setMessages(msgs);
        }
      } catch {
        /* start fresh on error */
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  // Focus the input once the Sheet content has mounted and any resume has settled.
  useEffect(() => {
    if (visible && !loading) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [visible, loading]);

  useEffect(() => () => clearWaitTimers(), []);

  // Keep the latest message in view. Instant when the panel first opens (avoids a
  // visible scroll-jump during the slide-in), smooth for subsequent messages.
  useEffect(() => {
    if (!visible) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waiting, visible]);

  const startPolling = (sid: string) => {
    clearWaitTimers();
    pollRef.current = setInterval(async () => {
      const latest = await api.agents.direct.messages(AGENT_ID, sid);
      setMessages(latest);
      const lastIsAgent = latest.length > 0 && latest[latest.length - 1].author !== "user";
      if (lastIsAgent) {
        setWaiting(false);
        setTimedOut(false);
        clearWaitTimers();
      }
    }, 2000);

    timeoutRef.current = setTimeout(() => {
      clearWaitTimers();
      setWaiting(false);
      setTimedOut(true);
    }, DISPATCH_TIMEOUT_MS);
  };

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setInput("");
    setTimedOut(false);
    try {
      if (!sessionId) {
        const msgs = await api.agents.direct.start(AGENT_ID, msg, USER_ID);
        const sid = msgs[0].session_id;
        setSessionId(sid);
        setMessages(msgs);
        setWaiting(true);
        startPolling(sid);
      } else {
        const userMsg = await api.agents.direct.send(AGENT_ID, sessionId, msg, USER_ID);
        setMessages((prev) => [...prev, userMsg]);
        setWaiting(true);
        startPolling(sessionId);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <Sheet open={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l border-zinc-700/60 bg-zinc-900/95 p-0 backdrop-blur-xl sm:max-w-[420px]"
      >
        {/* Visually-hidden title keeps the dialog accessible without showing header text. */}
        <SheetTitle className="sr-only">Support chat</SheetTitle>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-12 space-y-3">
          {loading && (
            <div className="flex items-center justify-center h-full text-sm text-zinc-500">
              Loading…
            </div>
          )}

          {!loading && messages.length === 0 && !waiting && !timedOut && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-zinc-300">How can we help?</p>
              <p className="text-xs text-zinc-500 max-w-[220px] leading-relaxed">
                Send a message to start the conversation.
              </p>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.author === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2 items-end`}>
                {!isUser && (
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3 h-3 text-white" />
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
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
                <MessageSquare className="w-3 h-3 text-white" />
              </div>
              <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                <motion.span className="w-1.5 h-1.5 rounded-full bg-zinc-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                <motion.span className="w-1.5 h-1.5 rounded-full bg-zinc-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.15 }} />
                <motion.span className="w-1.5 h-1.5 rounded-full bg-zinc-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.3 }} />
              </div>
            </div>
          )}

          {timedOut && (
            <div className="flex justify-start gap-2 items-end">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
                <MessageSquare className="w-3 h-3 text-white" />
              </div>
              <div className="bg-red-950/60 border border-red-500/30 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-red-400">
                No response after 2 minutes. The agent may be busy — try sending again.
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
              placeholder="Type a message…"
              rows={1}
              className="flex-1 resize-none bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/60 transition-colors max-h-28"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <motion.button
              onClick={send}
              disabled={!input.trim() || sending}
              className="shrink-0 w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              whileTap={{ scale: 0.92 }}
            >
              <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </motion.button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { formatTime } from "@/lib/utils";

const AGENT_COLORS: Record<string, string> = {
  dev: "text-blue-400",
  researcher: "text-purple-400",
  support: "text-orange-400",
};

export function TopNav() {
  const path = usePathname();
  const { notifications, unreadCount, markRead, markAllRead, openTask } =
    useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/tasks", label: "Tasks" },
    { href: "/projects", label: "Projects" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="font-semibold text-zinc-100 tracking-tight">Force</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                path === href
                  ? "text-zinc-100 bg-zinc-800"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notification Bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="relative p-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {panelOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-sm font-semibold text-zinc-100">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs font-normal text-indigo-400">
                      {unreadCount} new
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800/60">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-500">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      className={`w-full text-left px-4 py-3 hover:bg-zinc-800/50 transition-colors group ${
                        !n.read ? "bg-indigo-500/5" : ""
                      }`}
                      onClick={() => {
                        markRead(n.id);
                        setPanelOpen(false);
                        openTask(n.task_id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-300 truncate">
                            <span
                              className={
                                AGENT_COLORS[n.author] ?? "text-zinc-400"
                              }
                            >
                              @{n.author}
                            </span>
                            <span className="text-zinc-500 ml-1">
                              on
                            </span>
                            <span className="text-zinc-300 ml-1">
                              {n.task_title}
                            </span>
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-zinc-600">
                            {formatTime(n.created_at)}
                          </span>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-zinc-800 text-center">
                  <Link
                    href="/tasks"
                    onClick={() => setPanelOpen(false)}
                    className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
                  >
                    View all tasks →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api, RecentComment } from "@/lib/api";

export interface Notification extends RecentComment {
  read: boolean;
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
  openTask: (taskId: number) => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
  openTask: () => {},
});

const STORAGE_KEY = "force_last_comment_id";
const MAX_NOTIFICATIONS = 50;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const lastIdRef = useRef<number | null>(null);
  const bootstrappedRef = useRef(false);
  // Items that arrived while the tab was hidden; flushed as toasts on refocus.
  const pendingToastsRef = useRef<RecentComment[]>([]);
  const router = useRouter();

  const openTask = useCallback(
    (taskId: number) => {
      router.push(`/tasks?task=${taskId}`);
    },
    [router]
  );

  const markRead = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const showToast = useCallback(
    (item: RecentComment) => {
      const preview =
        item.body.length > 120
          ? item.body.slice(0, 120).trimEnd() + "…"
          : item.body;
      toast(`@${item.author} replied`, {
        description: preview,
        action: {
          label: "View Task",
          onClick: () => openTask(item.task_id),
        },
        duration: 8000,
      });
    },
    [openTask]
  );

  const poll = useCallback(
    async (isFirstEverVisit: boolean) => {
      try {
        const items = await api.comments.recent(lastIdRef.current ?? undefined);
        if (!items.length) return;

        // Items come newest-first; find any that are genuinely new
        const newItems =
          lastIdRef.current != null
            ? items.filter((i) => i.id > lastIdRef.current!)
            : items;

        const maxId = Math.max(...items.map((i) => i.id));
        lastIdRef.current = maxId;
        localStorage.setItem(STORAGE_KEY, String(maxId));

        if (!newItems.length) return;

        // On the very first visit ever (no stored baseline) we silently absorb
        // history: mark read, no toasts. On every other poll — including page
        // reloads where a baseline already existed — fresh comments are unread
        // and toast (or queue if the tab is hidden).
        const mapped: Notification[] = newItems.map((item) => ({
          ...item,
          read: isFirstEverVisit,
        }));

        setNotifications((prev) => {
          const ids = new Set(prev.map((n) => n.id));
          const fresh = mapped.filter((n) => !ids.has(n.id));
          return [...fresh, ...prev].slice(0, MAX_NOTIFICATIONS);
        });

        if (isFirstEverVisit) return;

        // Oldest-first so the newest toast lands on top of the stack.
        const ordered = [...newItems].sort((a, b) => a.id - b.id);
        if (document.visibilityState === "visible") {
          ordered.forEach(showToast);
        } else {
          pendingToastsRef.current.push(...ordered);
        }
      } catch {
        // silently ignore poll errors
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const stored = localStorage.getItem(STORAGE_KEY);
    const isFirstEverVisit = stored == null;
    if (stored != null) {
      lastIdRef.current = parseInt(stored, 10);
    }

    let interval: ReturnType<typeof setInterval>;

    // First poll only suppresses toasts if there was no prior baseline at all.
    poll(isFirstEverVisit).then(() => {
      interval = setInterval(() => poll(false), 10000);
    });

    // When the tab regains focus, fire any toasts that piled up while hidden.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const queued = pendingToastsRef.current;
      pendingToastsRef.current = [];
      queued.forEach(showToast);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll, showToast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, openTask }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}

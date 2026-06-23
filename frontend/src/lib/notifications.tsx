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

  const poll = useCallback(
    async (showToasts: boolean) => {
      try {
        const items = await api.comments.recent(lastIdRef.current ?? undefined);
        if (!items.length) return;

        // Items come newest-first; find any that are genuinely new
        const newItems = lastIdRef.current != null
          ? items.filter((i) => i.id > lastIdRef.current!)
          : items;

        const maxId = Math.max(...items.map((i) => i.id));
        lastIdRef.current = maxId;
        localStorage.setItem(STORAGE_KEY, String(maxId));

        if (!newItems.length) return;

        const mapped: Notification[] = newItems.map((item) => ({
          ...item,
          read: !showToasts,
        }));

        setNotifications((prev) => {
          const ids = new Set(prev.map((n) => n.id));
          const fresh = mapped.filter((n) => !ids.has(n.id));
          return [...fresh, ...prev].slice(0, MAX_NOTIFICATIONS);
        });

        if (showToasts && document.visibilityState === "visible") {
          newItems.forEach((item) => {
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
          });
        }
      } catch {
        // silently ignore poll errors
      }
    },
    [openTask]
  );

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      lastIdRef.current = parseInt(stored, 10);
    }

    let interval: ReturnType<typeof setInterval>;

    // Bootstrap without toasts, then start live polling
    poll(false).then(() => {
      interval = setInterval(() => poll(true), 10000);
    });

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [poll]);

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

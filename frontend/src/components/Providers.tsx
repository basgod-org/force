"use client";

import { Toaster } from "sonner";
import { NotificationsProvider } from "@/lib/notifications";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          classNames: {
            toast:
              "bg-zinc-900 border border-zinc-700 text-zinc-100 shadow-xl",
            description: "text-zinc-400 text-xs",
            actionButton:
              "bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium",
          },
        }}
      />
      {children}
    </NotificationsProvider>
  );
}

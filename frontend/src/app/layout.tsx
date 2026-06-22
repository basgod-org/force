import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Force — Agent Dashboard",
  description: "Manage your AI agent team",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}>
        <div className="flex min-h-screen">
          <nav className="w-56 border-r border-border bg-card flex-shrink-0 flex flex-col">
            <div className="px-6 py-5 border-b border-border">
              <span className="font-semibold text-lg tracking-tight">⚡ Force</span>
            </div>
            <div className="flex flex-col gap-1 p-3 flex-1">
              <NavItem href="/" label="Dashboard" />
              <NavItem href="/tasks" label="Tasks" />
              <NavItem href="/projects" label="Projects" />
            </div>
          </nav>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {label}
    </Link>
  );
}

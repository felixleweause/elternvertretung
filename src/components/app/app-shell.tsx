"use client";

import { Menu, ShieldCheck, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/app/theme-toggle";

type AppShellProps = {
  user: User;
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const supabase = getBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { href: "/app", label: "Übersicht" },
    { href: "/app/announcements", label: "Ankündigungen" },
    { href: "/app/events", label: "Termine" },
    { href: "/app/polls", label: "Umfragen" },
  ] as const;

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex h-16 items-center gap-3 px-6">
          <button
            type="button"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 md:hidden"
            )}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Navigation umschalten"
            aria-expanded={isMenuOpen}
            aria-controls="app-mobile-nav"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
            Elternvertretung
          </div>
          <nav className="ml-4 hidden items-center gap-2 text-sm font-medium text-zinc-500 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "rounded-md px-3 py-1 transition hover:text-zinc-900 dark:hover:text-zinc-100",
                  isActive(item.href)
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="hidden md:flex flex-col items-end">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {user.user_metadata?.name ?? user.email ?? "Account"}
              </span>
              <span className="text-xs">{user.email}</span>
            </div>
            <ThemeToggle className="text-zinc-500 dark:text-zinc-400" />
        <Button
          variant="outline"
          className="gap-2 hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700 dark:hover:border-rose-800 dark:hover:bg-rose-900/40 dark:hover:text-rose-200"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>
        {isMenuOpen ? (
          <nav
            id="app-mobile-nav"
            className="flex flex-col gap-1 border-t border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 md:hidden"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "rounded-md px-3 py-2 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
                  isActive(item.href)
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-transparent"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">{children}</div>
      </main>
    </div>
  );
}

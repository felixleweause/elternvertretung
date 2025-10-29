"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function AppHomeFallback() {
  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-8 shadow-lg dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1.2fr]">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </section>
  );
}

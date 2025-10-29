"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40" />
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  );
}

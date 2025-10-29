"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-44" />
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

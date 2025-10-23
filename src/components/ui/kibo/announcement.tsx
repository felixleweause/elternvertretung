"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AnnouncementProps = React.HTMLAttributes<HTMLDivElement>;

export function Announcement({ className, ...props }: AnnouncementProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 rounded-lg border border-zinc-200 bg-white/70 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-100 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-50 dark:ring-zinc-800",
        className
      )}
      {...props}
    />
  );
}

type AnnouncementTagProps = React.HTMLAttributes<HTMLSpanElement>;

export function AnnouncementTag({ className, ...props }: AnnouncementTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        className
      )}
      {...props}
    />
  );
}

type AnnouncementTitleProps = React.HTMLAttributes<HTMLParagraphElement>;

export function AnnouncementTitle({
  className,
  ...props
}: AnnouncementTitleProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50",
        className
      )}
      {...props}
    />
  );
}

type AnnouncementDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function AnnouncementDescription({
  className,
  ...props
}: AnnouncementDescriptionProps) {
  return (
    <p
      className={cn(
        "text-sm text-zinc-600 dark:text-zinc-400",
        className
      )}
      {...props}
    />
  );
}

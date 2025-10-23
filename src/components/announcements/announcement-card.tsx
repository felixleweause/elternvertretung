"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnnouncementListItem } from "./types";

type AnnouncementCardProps = {
  item: AnnouncementListItem;
};

export function AnnouncementCard({ item }: AnnouncementCardProps) {
  const [isRead, setIsRead] = useState(item.isRead);
  const [isMarking, setIsMarking] = useState(false);
  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    if (!isRead) {
      markRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async () => {
    if (isRead || isMarking) return;
    setIsMarking(true);
    try {
      const response = await fetch(`/api/announcements/${item.id}/read`, {
        method: "POST",
      });
      if (response.ok) {
        setIsRead(true);
      }
    } catch (error) {
      console.error("Failed to mark announcement as read", error);
    } finally {
      setIsMarking(false);
    }
  };

  useEffect(() => {
    const createdAtDate = new Date(item.createdAt);
    const formatter = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });
    const updateRelative = () => {
      const diffMs = createdAtDate.getTime() - Date.now();
      const diffMinutes = Math.round(diffMs / 60000);
      if (Math.abs(diffMinutes) < 60) {
        setRelativeTime(formatter.format(diffMinutes, "minute"));
        return;
      }
      const diffHours = Math.round(diffMinutes / 60);
      if (Math.abs(diffHours) < 24) {
        setRelativeTime(formatter.format(diffHours, "hour"));
        return;
      }
      const diffDays = Math.round(diffHours / 24);
      setRelativeTime(formatter.format(diffDays, "day"));
    };
    updateRelative();
    const interval = window.setInterval(updateRelative, 60_000);
    return () => window.clearInterval(interval);
  }, [item.createdAt]);

  const createdAt = new Date(item.createdAt);

  const fallbackTime = `${createdAt.toLocaleDateString("de-DE")} ${createdAt.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
        item.pinned && "ring-1 ring-amber-400/60 dark:ring-amber-300/50"
      )}
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {item.pinned ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Fixiert
              </span>
            ) : null}
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {item.scopeType === "school" ? "Schule" : item.scopeLabel}
            </span>
            {!isRead ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Neu
              </span>
            ) : null}
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {item.title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {item.createdBy.name ?? item.createdBy.email ?? "Unbekannt"} ·{" "}
            {relativeTime || fallbackTime}
          </p>
        </div>
        {item.requiresAck ? (
          <Button
            variant={isRead ? "secondary" : "default"}
            size="sm"
            onClick={markRead}
            disabled={isMarking}
            className="self-start sm:self-auto"
          >
            {isRead ? "Bestätigt" : "Bestätigen"}
          </Button>
        ) : null}
      </header>

      <div className="space-y-3 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
        {item.body.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          <span>Lesestatus: {isRead ? "gesehen" : "offen"}</span>
          {item.allowComments ? <span>Kommentare erlaubt</span> : <span>Kommentare deaktiviert</span>}
        </div>
        <span>Erstellt am {fallbackTime}</span>
      </footer>
    </article>
  );
}

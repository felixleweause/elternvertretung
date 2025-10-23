import Link from "next/link";
import type { EventListItem } from "./types";

type EventListProps = {
  events: EventListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const endFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

function buildDateLabel(startAt: string, endAt: string | null) {
  const start = new Date(startAt);
  const base = dateFormatter.format(start);
  if (!endAt) {
    return base;
  }
  const end = new Date(endAt);
  return `${base} – ${endFormatter.format(end)}`;
}

function resolveRsvpStatus(status: EventListItem["rsvpStatus"]) {
  if (!status) {
    return {
      label: "Keine Rückmeldung",
      className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    };
  }
  if (status === "yes") {
    return {
      label: "Zusage",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    };
  }
  if (status === "maybe") {
    return {
      label: "Vielleicht",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    };
  }
  return {
    label: "Absage",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  };
}

export function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Noch keine Termine geplant. Sobald deine Klassenvertretung oder die GEV Termine
        anlegt, erscheinen sie hier.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {events.map((event) => {
        const rsvp = resolveRsvpStatus(event.rsvpStatus);
        return (
          <article
            key={event.id}
            className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {event.scopeType === "school" ? "Schule" : event.scopeLabel}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 ${rsvp.className}`}>
                    {rsvp.label}
                  </span>
                  {event.remind24h || event.remind2h ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Erinnerung aktiv
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {event.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {buildDateLabel(event.startAt, event.endAt)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              <Link
                href={`/app/events/${event.id}`}
                className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600"
              >
                Details &amp; RSVP
              </Link>
            </header>
            {event.description ? (
              <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                {event.description.length > 220
                  ? `${event.description.slice(0, 220)}…`
                  : event.description}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

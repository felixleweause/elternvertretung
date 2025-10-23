import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EventRsvpChips } from "@/components/events/event-rsvp-chips";
import { EventReminderToggle } from "@/components/events/event-reminder-toggle";
import type { EventDetail } from "@/components/events/types";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const endFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

type PageParams = {
  params: {
    id: string;
  };
};

export default async function EventDetailPage({ params }: PageParams) {
  const { id } = params;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: eventRecord, error: eventError } = await supabase
    .from("events")
    .select(
      `
        id,
        school_id,
        scope_type,
        scope_id,
        title,
        description,
        start_at,
        end_at,
        location,
        remind_24h,
        remind_2h,
        created_at,
        created_by,
        profiles (
          id,
          name,
          email
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (eventError) {
    console.error("Failed to load event detail", eventError);
  }

  if (!eventRecord) {
    notFound();
  }

  let scopeLabel = "Gesamte Schule";
  if (eventRecord.scope_type === "class") {
    const { data: classroom } = await supabase
      .from("classrooms")
      .select("name, year")
      .eq("id", eventRecord.scope_id)
      .maybeSingle();
    scopeLabel = classroom
      ? `${classroom.name}${classroom.year ? ` · Jahrgang ${classroom.year}` : ""}`
      : "Klasse";
  }

  const { data: rsvpRow } = await supabase
    .from("rsvps")
    .select("status")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: manageResult } = await supabase.rpc("can_manage_event", {
    p_event_id: id,
  });

  let attendeeCount: EventDetail["attendeeCount"] = null;
  if (manageResult === true) {
    const { data: allRsvps } = await supabase
      .from("rsvps")
      .select("status")
      .eq("event_id", id);

    if (allRsvps) {
      const counts = allRsvps.reduce(
        (acc, row) => {
          if (row.status === "yes") acc.yes += 1;
          if (row.status === "no") acc.no += 1;
          if (row.status === "maybe") acc.maybe += 1;
          return acc;
        },
        { yes: 0, no: 0, maybe: 0 }
      );
      attendeeCount = counts;
    }
  }

  const event: EventDetail = {
    id: eventRecord.id,
    schoolId: eventRecord.school_id,
    scopeType: eventRecord.scope_type,
    scopeId: eventRecord.scope_id,
    scopeLabel,
    title: eventRecord.title,
    description: eventRecord.description,
    startAt: eventRecord.start_at,
    endAt: eventRecord.end_at,
    location: eventRecord.location,
    remind24h: eventRecord.remind_24h ?? false,
    remind2h: eventRecord.remind_2h ?? false,
    createdAt: eventRecord.created_at,
    createdBy: {
      id: eventRecord.profiles?.id ?? null,
      name: eventRecord.profiles?.name ?? null,
      email: eventRecord.profiles?.email ?? null,
    },
    rsvpStatus:
      rsvpRow?.status === "yes" || rsvpRow?.status === "no" || rsvpRow?.status === "maybe"
        ? rsvpRow.status
        : null,
    canManage: manageResult === true,
    attendeeCount,
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app/events"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Zurück zur Übersicht
        </Link>
        <Button asChild variant="outline">
          <a href={`/api/events/${event.id}/ics`} download>
            iCal herunterladen
          </a>
        </Button>
      </div>

      <header className="space-y-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {event.scopeType === "school" ? "Schule" : event.scopeLabel}
          </span>
          {event.remind24h || event.remind2h ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Erinnerung aktiv
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          {event.title}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatDateRange(event.startAt, event.endAt)}
          {event.location ? ` · ${event.location}` : ""}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Angelegt von {event.createdBy.name ?? event.createdBy.email ?? "Unbekannt"} am{" "}
          {dateFormatter.format(new Date(event.createdAt))}
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <article className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-sm leading-6 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Beschreibung
          </h2>
          {event.description ? (
            event.description.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Für diesen Termin wurde keine zusätzliche Beschreibung hinterlegt.
            </p>
          )}
        </article>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Deine Rückmeldung
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Teile deiner Vertretung mit, ob du teilnehmen kannst.
            </p>
            <div className="mt-4">
              <EventRsvpChips eventId={event.id} initialStatus={event.rsvpStatus} />
            </div>
          </div>

          {event.canManage ? (
            <EventReminderToggle
              eventId={event.id}
              initial24h={event.remind24h}
              initial2h={event.remind2h}
            />
          ) : null}

          {event.canManage && event.attendeeCount ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Rückmeldungen
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>✔ Zusagen: {event.attendeeCount.yes}</li>
                <li>~ Vielleicht: {event.attendeeCount.maybe}</li>
                <li>✖ Absagen: {event.attendeeCount.no}</li>
              </ul>
            </div>
          ) : null}
        </aside>
      </section>
    </section>
  );
}

function formatDateRange(startAt: string, endAt: string | null) {
  const start = new Date(startAt);
  const base = dateFormatter.format(start);
  if (!endAt) {
    return base;
  }
  const end = new Date(endAt);
  return `${base} – ${endFormatter.format(end)}`;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  isReminderColumnMissing,
  logReminderColumnWarning,
} from "@/lib/supabase/reminder-support";
import { EventComposer } from "@/components/events/event-composer";
import { EventList } from "@/components/events/event-list";
import type {
  EventListItem,
  EventScopeOption,
} from "@/components/events/types";

export const metadata: Metadata = {
  title: "Termine",
};

export default async function EventsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Dein Profil ist noch nicht vollständig. Bitte kontaktiere den Admin, damit dir eine
        Schule zugewiesen wird.
      </div>
    );
  }

  const windowStartDate = new Date();
  windowStartDate.setDate(windowStartDate.getDate() - 14);
  const windowStart = windowStartDate.toISOString();

  const eventsSelection = supabase
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
          profiles (
            id,
            name,
            email
          )
        `
    )
    .gte("start_at", windowStart)
    .order("start_at", { ascending: true })
    .limit(50);

  const [mandatesResponse, eventsResponse, rsvpResponse] = await Promise.all([
    supabase
      .from("mandates")
      .select("scope_type, scope_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active"),
    eventsSelection,
    supabase
      .from("rsvps")
      .select("event_id, status")
      .eq("user_id", user.id),
  ]);

  let remindersAvailable = true;

  if (eventsResponse.error) {
    if (isReminderColumnMissing(eventsResponse.error)) {
      remindersAvailable = false;
      logReminderColumnWarning("list fetch");
    } else {
      console.error("Failed to load events", eventsResponse.error);
    }
  }

  let eventsData = eventsResponse.data ?? [];

  if (!remindersAvailable) {
    const fallback = await supabase
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
          created_at,
          profiles (
            id,
            name,
            email
          )
        `
      )
      .gte("start_at", windowStart)
      .order("start_at", { ascending: true })
      .limit(50);

    if (fallback.error) {
      console.error("Failed to load events without reminder columns", fallback.error);
    }

    eventsData = fallback.data ?? [];
  }

  const rsvpData = rsvpResponse.data ?? [];

  const classIds = Array.from(
    new Set(
      eventsData
        .filter((event) => event.scope_type === "class")
        .map((event) => event.scope_id)
    )
  );

  const classInfo =
    classIds.length > 0
      ? await supabase
          .from("classrooms")
          .select("id, name, year")
          .in("id", classIds)
      : { data: [], error: null };

  if (classInfo.error) {
    console.error("Failed to load class labels for events", classInfo.error);
  }

  const classMap = new Map(
    (classInfo.data ?? []).map((clazz) => [
      clazz.id,
      `${clazz.name}${clazz.year ? ` · Jahrgang ${clazz.year}` : ""}`,
    ])
  );

  const rsvpMap = new Map<string, "yes" | "no" | "maybe">(
    rsvpData
      .filter(
        (row): row is { event_id: string; status: "yes" | "no" | "maybe" } =>
          row.status === "yes" || row.status === "no" || row.status === "maybe"
      )
      .map((row) => [row.event_id, row.status])
  );

  const events: EventListItem[] = eventsData.map((event) => ({
    id: event.id,
    schoolId: event.school_id,
    scopeType: event.scope_type,
    scopeId: event.scope_id,
    scopeLabel:
      event.scope_type === "school"
        ? "Gesamte Schule"
        : classMap.get(event.scope_id) ?? "Klasse",
    title: event.title,
    description: event.description,
    startAt: event.start_at,
    endAt: event.end_at,
    location: event.location,
    remind24h: event.remind_24h ?? false,
    remind2h: event.remind_2h ?? false,
    createdAt: event.created_at,
    createdBy: {
      id: event.profiles?.id ?? null,
      name: event.profiles?.name ?? null,
      email: event.profiles?.email ?? null,
    },
    rsvpStatus: rsvpMap.get(event.id) ?? null,
  }));

  const composerScopes: EventScopeOption[] = buildComposerScopes(
    mandatesResponse.data ?? [],
    classMap,
    profile.school_id
  );

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Termine &amp; RSVPs</p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Bevorstehende Veranstaltungen
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Koordiniere Elternabende, schulweite Treffen und informiere Teilnehmende mit
          automatischen Erinnerungen.
        </p>
      </header>

      {composerScopes.length > 0 ? (
        <EventComposer
          scopes={composerScopes}
          remindersAvailable={remindersAvailable}
        />
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Anstehende Termine
        </h2>
        <EventList events={events} />
      </section>
    </section>
  );
}

type MandateRow = {
  scope_type: "class" | "school";
  scope_id: string;
  role: string;
  status: string;
};

function buildComposerScopes(
  mandates: MandateRow[],
  classMap: Map<string, string>,
  schoolId: string
): EventScopeOption[] {
  const scopes: EventScopeOption[] = [];

  const schoolGranted = mandates.some(
    (mandate) =>
      mandate.scope_type === "school" &&
      (mandate.role === "gev" || mandate.role === "admin")
  );

  if (schoolGranted) {
    scopes.push({
      scopeType: "school",
      scopeId: schoolId,
      label: "Gesamte Schule",
    });
  }

  mandates
    .filter(
      (mandate) =>
        mandate.scope_type === "class" &&
        ["class_rep", "class_rep_deputy"].includes(mandate.role)
    )
    .forEach((mandate) => {
      const label =
        classMap.get(mandate.scope_id) ?? "Klasse (unbekanntes Label)";
      scopes.push({
        scopeType: "class",
        scopeId: mandate.scope_id,
        label,
      });
    });

  return scopes;
}

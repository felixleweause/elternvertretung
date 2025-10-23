import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: event, error } = await supabase
    .from("events")
    .select(
      `
        id,
        title,
        description,
        start_at,
        end_at,
        location,
        scope_type,
        scope_id,
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
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load event for ICS export", error);
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  const start = formatDateToICal(event.start_at);
  const end = formatDateToICal(
    event.end_at ?? new Date(new Date(event.start_at).getTime() + 60 * 60 * 1000).toISOString()
  );

  const nowStamp = formatDateToICal(new Date().toISOString());
  const organizer = event.profiles?.email ?? "noreply@elternvertretung.app";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Elternvertretung//Termine//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(`${event.id}@elternvertretung.app`)}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : null,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : null,
    `ORGANIZER;CN=${escapeIcs(event.profiles?.name ?? "Elternvertretung")}:MAILTO:${escapeIcs(organizer)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];

  const icsBody = lines.join("\r\n");

  return new Response(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${event.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

function formatDateToICal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

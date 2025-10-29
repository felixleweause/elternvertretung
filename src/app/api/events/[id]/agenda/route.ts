import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { sanitizeAgendaPayload, sanitizeMinutesPayload } from "@/lib/events/documents";
import {
  detectMissingColumns,
  logAgendaColumnWarning,
  type PostgrestLikeError,
} from "@/lib/supabase/reminder-support";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    agenda?: unknown;
    minutes?: unknown;
  };

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: canManage } = await supabase.rpc("can_manage_event", {
    p_event_id: id,
  });

  if (!canManage) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sanitizedAgenda = sanitizeAgendaPayload(payload.agenda);
  const sanitizedMinutes = sanitizeMinutesPayload(payload.minutes);

  const updates: Record<string, unknown> = {};
  if (sanitizedAgenda) {
    updates.agenda = sanitizedAgenda;
  }
  if (sanitizedMinutes) {
    updates.minutes = sanitizedMinutes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const update = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .select("school_id, agenda, minutes")
    .maybeSingle();

  if (update.error) {
    const missingColumns = detectMissingColumns(update.error as PostgrestLikeError, [
      "agenda",
      "minutes",
    ]);

    if (missingColumns.length > 0) {
      logAgendaColumnWarning("agenda update");
      return NextResponse.json(
        {
          error:
            "Agenda und Protokoll sind noch nicht aktiviert. Bitte führe die Migration 20241026150000_events_agenda_minutes aus.",
        },
        { status: 409 }
      );
    }

    console.error("Failed to update agenda/minutes", update.error);
    return NextResponse.json(
      {
        error: update.error.message ?? "agenda_update_failed",
      },
      { status: 400 }
    );
  }

  if (!update.data) {
    return NextResponse.json(
      {
        error: "event_not_found",
      },
      { status: 404 }
    );
  }

  const { school_id, agenda: agendaData, minutes: minutesData } = update.data;

  if (school_id) {
    const auditMeta = {
      agendaItems: sanitizedAgenda?.items?.length ?? null,
      minutesEntries: sanitizedMinutes?.entries?.length ?? null,
    };

    const auditInsert = await supabase.from("audit_log").insert({
      school_id,
      actor_id: user.id,
      action: "event.agenda.update",
      entity: "event",
      entity_id: id,
      meta: auditMeta,
    });

    if (auditInsert.error) {
      console.warn("Failed to append audit log for agenda update", auditInsert.error);
    }
  }

  return NextResponse.json(
    {
      agenda: agendaData ?? sanitizedAgenda ?? [],
      minutes: minutesData ?? sanitizedMinutes ?? [],
    },
    { status: 200 }
  );
}

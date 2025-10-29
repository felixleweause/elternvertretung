import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import {
  isReminderColumnMissing,
  logReminderColumnWarning,
} from "@/lib/supabase/reminder-support";

type Params = {
  params: {
    id?: string;
  };
};

type EventUpdatePayload = {
  remind_24h?: boolean;
  remind_2h?: boolean;
};

export async function PATCH(request: Request, { params }: Params) {
  const id = params?.id ?? extractIdFromUrl(request.url);

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const payload: EventUpdatePayload = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof payload.remind_24h === "boolean") {
    updates.remind_24h = payload.remind_24h;
  }

  if (typeof payload.remind_2h === "boolean") {
    updates.remind_2h = payload.remind_2h;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isReminderColumnMissing(error)) {
      logReminderColumnWarning("event update");
      return NextResponse.json(
        {
          error:
            "Erinnerungen sind für diese Instanz noch nicht aktiviert. Bitte aktualisiere das Supabase-Schema.",
        },
        { status: 409 }
      );
    }
    console.error("Failed to update event", error);
    return NextResponse.json(
      { error: error.message ?? "update_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

function extractIdFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    // /api/events/:id
    if (segments.length >= 3) {
      return segments[2] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

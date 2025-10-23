import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type Params = {
  params: {
    id: string;
  };
};

const VALID_STATUSES = new Set(["yes", "no", "maybe"]);

export async function POST(request: Request, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
  };

  const status = body.status;
  if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("rsvps")
    .upsert(
      {
        event_id: id,
        user_id: user.id,
        status,
        responded_at: new Date().toISOString(),
      },
      {
        onConflict: "event_id,user_id",
      }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to upsert RSVP", error);
    return NextResponse.json(
      { error: error.message ?? "rsvp_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

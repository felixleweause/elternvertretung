import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { assignMandatesFromPoll } from "@/lib/polls/mandates";
import type { CandidateAssignment } from "@/lib/polls/mandates";
import type { Database } from "@/lib/supabase/database";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type PatchPayload = {
  status?: unknown;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => ({}))) as PatchPayload;
  const { status } = payload;

  if (status !== "closed" && status !== "open") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: pollRecord, error: pollError } = await supabase
    .from("polls")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (pollError) {
    console.error("Failed to load poll for patch", pollError);
    return NextResponse.json({ error: "poll_lookup_failed" }, { status: 400 });
  }

  if (!pollRecord) {
    return NextResponse.json({ error: "poll_not_found" }, { status: 404 });
  }

  const { data: canManage } = await supabase.rpc("can_manage_poll", {
    p_poll_id: id,
  });

  if (canManage !== true) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "closed") {
    updatePayload.closed_at = new Date().toISOString();
  } else {
    updatePayload.closed_at = null;
  }

  const { data, error } = await supabase
    .from("polls")
    .update(updatePayload)
    .eq("id", id)
    .select(
      `
        id,
        status,
        closed_at,
        kind,
        school_id,
        scope_type,
        scope_id
      `
    )
    .maybeSingle();

  if (error) {
    console.error("Failed to update poll status", error);
    return NextResponse.json(
      { error: error.message ?? "poll_update_failed" },
      { status: 400 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "poll_update_failed" }, { status: 400 });
  }

  let assignments: CandidateAssignment[] = [];

  if (status === "closed" && pollRecord.status !== "closed") {
    const { error: auditError } = await supabase.from("audit_log").insert({
      action: "POLL_CLOSE",
      actor_id: user.id,
      entity: "poll",
      entity_id: id,
      school_id: data.school_id ?? null,
      meta: {
        previous_status: pollRecord.status,
        scope_type: data.scope_type,
        scope_id: data.scope_id,
      },
    });
    if (auditError) {
      console.error("Failed to insert poll close audit entry", auditError);
    }

    assignments = await assignMandatesFromPoll(supabase, id, user.id);
  }

  return NextResponse.json({ data, assignments }, { status: 200 });
}

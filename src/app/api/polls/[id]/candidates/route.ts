import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { 
  createCandidateRecords,
  dedupeCandidates,
  listCandidateRecords,
  type CandidateDraft,
  type CandidateRecord,
} from "@/lib/polls/candidate-service";
import type { Database } from "@/lib/supabase/database";

type Supabase = SupabaseClient<Database>;

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type CandidateInput = {
  office?: unknown;
  displayName?: unknown;
};

type RequestPayload = {
  candidates?: CandidateInput[];
  expiresInDays?: unknown;
};

function sanitizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, 120);
}

function sanitizeOffice(value: unknown): "class_rep" | "class_rep_deputy" | null {
  if (value === "class_rep" || value === "class_rep_deputy") {
    return value;
  }
  return null;
}

async function fetchPoll(
  supabase: Supabase,
  pollId: string
): Promise<{
  id: string;
  school_id: string;
  scope_type: "class" | "school";
  scope_id: string;
  kind: "general" | "election";
  mandate_rule: string | null;
  options: any;
  seats: number;
} | null> {
  const { data, error } = await supabase
    .from("polls")
    .select(
      `
        id,
        school_id,
        scope_type,
        scope_id,
        kind,
        mandate_rule,
        options,
        seats
      `
    )
    .eq("id", pollId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load poll for candidates", error);
    return null;
  }
  return data;
}

async function ensureManageAccess(supabase: Supabase, pollId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_manage_poll", { p_poll_id: pollId });
  if (error) {
    console.error("can_manage_poll failed", error);
    return false;
  }
  return data === true;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => ({}))) as RequestPayload;
  const expireDaysRaw = payload.expiresInDays;
  const candidateInputs = Array.isArray(payload.candidates)
    ? payload.candidates
    : [];

  const sanitized = dedupeCandidates(
    candidateInputs
      .map((entry) => {
        const office = sanitizeOffice(entry.office);
        const displayName = sanitizeDisplayName(entry.displayName);
        if (!office || !displayName) {
          return null;
        }
        return { office, displayName } as CandidateDraft;
      })
      .filter((entry): entry is CandidateDraft => Boolean(entry))
  );

  if (sanitized.length === 0) {
    return NextResponse.json(
      { error: "Trage mindestens eine:n Kandidat:in mit gültigem Amt ein." },
      { status: 400 }
    );
  }

  const officeSet = new Set(sanitized.map((entry) => entry.office));
  if (officeSet.size > 1) {
    return NextResponse.json(
      { error: "Bitte erfasse die Kandidat:innen pro Amt in separaten Schritten." },
      { status: 400 }
    );
  }

  // Using getServerSupabase() instead
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du bist nicht angemeldet." }, { status: 401 });
  }

  const poll = await fetchPoll(supabase, id);

  if (!poll) {
    return NextResponse.json({ error: "Umfrage wurde nicht gefunden." }, { status: 404 });
  }

  if (poll.kind !== "election") {
    return NextResponse.json(
      { error: "Für diese Umfrage können keine Kandidaten-Codes erzeugt werden." },
      { status: 400 }
    );
  }

  if (poll.scope_type !== "class" || !poll.scope_id) {
    return NextResponse.json(
      { error: "Kandidaten-Codes sind nur für Klassenwahlen verfügbar." },
      { status: 400 }
    );
  }

  const canManage = await ensureManageAccess(supabase, id);

  if (!canManage) {
    return NextResponse.json({ error: "Du darfst diese Wahl nicht bearbeiten." }, { status: 403 });
  }

  const existing = await listCandidateRecords(supabase, id);
  const targetOffice = sanitized[0].office;
  if (
    existing.length > 0 &&
    existing.some((row) => row.office !== targetOffice)
  ) {
    return NextResponse.json(
      { error: "Dieses Amt wurde bereits mit einem anderen Typ verknüpft." },
      { status: 409 }
    );
  }
  const existingMap = new Map<string, CandidateRecord>();
  for (const row of existing) {
    existingMap.set(`${row.office}:${row.displayName.toLowerCase()}`, row);
  }

  const expireDays =
    typeof expireDaysRaw === "number" && Number.isFinite(expireDaysRaw)
      ? Math.max(1, Math.min(30, Math.floor(expireDaysRaw)))
      : 14;

  let created: CandidateRecord[] = [];

  try {
    created = await createCandidateRecords(
      supabase,
      {
        id,
        school_id: poll.school_id!,
        scope_type: poll.scope_type,
        scope_id: poll.scope_id,
        kind: poll.kind,
      },
      user.id,
      sanitized,
      expireDays
    );
  } catch (creationError) {
    console.error("Failed to create candidate records", creationError);
    return NextResponse.json(
      { error: "Codes konnten nicht erzeugt werden. Bitte versuch es erneut." },
      { status: 400 }
    );
  }

  if (created.length > 0) {
    const auditPayload = created.map((row) => ({
      action: "CANDIDATE_CODE_CREATE",
      actor_id: user.id,
      entity: "poll_candidate",
      entity_id: row.id,
      school_id: poll.school_id!,
      meta: {
        poll_id: id,
        office: row.office,
        display_name: row.displayName,
      },
    }));

    const { error: auditError } = await supabase.from("audit_log").insert(auditPayload);
    if (auditError) {
      console.error("Failed to insert candidate audit logs", auditError);
    }
  }

  const combined = sanitized.map((entry) => {
    const key = `${entry.office}:${entry.displayName.toLowerCase()}`;
    return existingMap.get(key) ?? created.find((row) => `${row.office}:${row.displayName.toLowerCase()}` === key)!;
  });

  const allCandidates = await listCandidateRecords(supabase, id);
  const fullOptions = allCandidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.displayName,
    office: candidate.office,
  }));

  const { error: updateError } = await supabase
    .from("polls")
    .update({
      options: fullOptions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to update poll options after candidate sync", updateError);
  }

  return NextResponse.json(
    {
      data: combined.map((entry) => ({
        ...entry,
        claimUrl: `/claim?c=${encodeURIComponent(entry.claimCode)}`,
      })),
    },
    { status: 201 }
  );
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  // Using getServerSupabase() instead
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du bist nicht angemeldet." }, { status: 401 });
  }

  const poll = await fetchPoll(supabase, id);
  if (!poll) {
    return NextResponse.json({ error: "Umfrage wurde nicht gefunden." }, { status: 404 });
  }

  const canManage = await ensureManageAccess(supabase, id);
  if (!canManage) {
    return NextResponse.json({ error: "Du darfst diese Wahl nicht einsehen." }, { status: 403 });
  }

  const candidates = await listCandidateRecords(supabase, id);

  return NextResponse.json(
    {
      data: candidates.map((candidate) => ({
        id: candidate.id,
        office: candidate.office,
        displayName: candidate.displayName,
        claimCode: candidate.claimCode,
        status: candidate.status,
        userId: candidate.userId,
        claimedAt: candidate.claimedAt,
        expiresAt: candidate.expiresAt,
        claimUrl: `/claim?c=${encodeURIComponent(candidate.claimCode)}`,
      })),
    },
    { status: 200 }
  );
}

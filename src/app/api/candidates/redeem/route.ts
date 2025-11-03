import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type RedeemPayload = {
  code?: unknown;
};

const ERROR_STATUS: Record<string, number> = {
  not_authenticated: 401,
  invalid_code: 400,
  code_not_found: 404,
  code_expired: 410,
  profile_missing: 409,
  code_wrong_school: 403,
  code_used: 409,
};

function splitError(message: string | null): { key: string | null; text: string | null } {
  if (!message) {
    return { key: null, text: null };
  }

  const [key, ...rest] = message.split(" ");
  if (!key) {
    return { key: null, text: message };
  }
  return {
    key,
    text: rest.length > 0 ? rest.join(" ").trim() : null,
  };
}

function mapErrorToStatus(key: string | null): number {
  if (!key) {
    return 400;
  }

  if (key && key in ERROR_STATUS) {
    return ERROR_STATUS[key];
  }

  return 400;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as RedeemPayload;
  const { code } = payload;

  if (typeof code !== "string" || code.trim().length < 8) {
    return NextResponse.json(
      { error: "Bitte gib einen gültigen Code ein." },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du bist nicht angemeldet." }, { status: 401 });
  }

  const normalized = code.trim().toUpperCase();

  const { data, error } = await supabase.rpc("redeem_candidate_code", {
    p_claim_code: normalized,
  });

  if (error) {
    console.error("redeem_candidate_code failed", error);
    const { key, text } = splitError(error.message ?? null);
    const status = mapErrorToStatus(key);
    return NextResponse.json(
      { error: text ?? "Code konnte nicht eingelöst werden." },
      { status }
    );
  }

  const alreadyClaimed =
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).already_claimed === true;

  const autoEnrolled =
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).auto_enrolled === true;

  return NextResponse.json(
    {
      data: {
        candidateId:
          typeof data === "object" && data !== null
            ? ((data as Record<string, unknown>).candidate_id as string | null)
            : null,
        pollId:
          typeof data === "object" && data !== null
            ? ((data as Record<string, unknown>).poll_id as string | null)
            : null,
        office:
          typeof data === "object" && data !== null
            ? ((data as Record<string, unknown>).office as string | null)
            : null,
        alreadyClaimed,
        autoEnrolled,
      },
    },
    { status: alreadyClaimed ? 200 : 201 }
  );
}

import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";

type RequestPayload = {
  code?: string;
  childInitials?: string | null;
};

export async function POST(request: Request) {
  const { code, childInitials }: RequestPayload = await request.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json(
      { error: "missing_code" },
      { status: 400 }
    );
  }

  // Using getServerSupabase() instead
  const supabase = await getServerSupabase();

  const normalizedCode = code.trim().toUpperCase();
  const trimmedInitials =
    childInitials && typeof childInitials === "string"
      ? childInitials.trim()
      : null;

  const { data, error } = await supabase.rpc("enroll_with_class_code", {
    p_code: normalizedCode,
    p_child_initials: trimmedInitials || undefined,
  });

  if (error) {
    console.error("enroll_with_class_code error", error);
    return NextResponse.json(
      { error: error.message ?? "unknown_error" },
      { status: 400 }
    );
  }

  return NextResponse.json({ data }, { status: 200 });
}

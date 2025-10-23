import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

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

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const normalizedCode = code.trim().toUpperCase();
  const trimmedInitials =
    childInitials && typeof childInitials === "string"
      ? childInitials.trim()
      : null;

  const { data, error } = await supabase.rpc("enroll_with_class_code", {
    p_code: normalizedCode,
    p_child_initials: trimmedInitials,
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

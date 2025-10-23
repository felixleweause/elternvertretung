import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type AnnouncementPayload = {
  title?: string;
  body?: string;
  scope_type?: "class" | "school";
  scope_id?: string;
  allow_comments?: boolean;
  requires_ack?: boolean;
};

export async function POST(request: Request) {
  const payload: AnnouncementPayload = await request.json();
  const {
    title,
    body,
    scope_type,
    scope_id,
    allow_comments = false,
    requires_ack = false,
  } = payload;

  if (
    !title ||
    !body ||
    !scope_type ||
    !scope_id ||
    typeof title !== "string" ||
    typeof body !== "string" ||
    (scope_type !== "class" && scope_type !== "school")
  ) {
    return NextResponse.json(
      { error: "invalid_payload" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  if (!trimmedTitle || !trimmedBody) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: trimmedTitle,
      body: trimmedBody,
      scope_type,
      scope_id,
      attachments: [],
      allow_comments,
      requires_ack,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to create announcement", error);
    return NextResponse.json(
      { error: error.message ?? "insert_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ data }, { status: 200 });
}

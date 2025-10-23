import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data, error } = await supabase.rpc("mark_announcement_read", {
    p_announcement_id: id,
  });

  if (error) {
    console.error("Failed to mark announcement read", error);
    return NextResponse.json(
      { error: error.message ?? "mark_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ read_at: data }, { status: 200 });
}

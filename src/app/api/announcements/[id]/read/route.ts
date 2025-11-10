import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: Params) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  // Using getServerSupabase() instead
  const supabase = await getServerSupabase();

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

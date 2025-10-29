import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const errorCode = requestUrl.searchParams.get("error_code") ?? requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (errorCode) {
    const redirectUrl = new URL("/login", requestUrl.origin);
    redirectUrl.searchParams.set("error", errorCode);
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Supabase exchangeCodeForSession error:", error.message);
      const redirectUrl = new URL("/login", requestUrl.origin);
      redirectUrl.searchParams.set("error", "magic-link");
      return NextResponse.redirect(redirectUrl);
    }
  }

  const redirectPath = next && next.startsWith("/") ? next : "/app";

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}

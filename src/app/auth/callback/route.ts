import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

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
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Supabase exchangeCodeForSession error:", error.message);
      
      // If it's a PKCE error, try to get the user directly
      if (error.message.includes("code verifier")) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (user && !userError) {
          // User exists, proceed with redirect
          const redirectPath = next && next.startsWith("/") ? next : "/app";
          return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
        }
      }
      
      const redirectUrl = new URL("/login", requestUrl.origin);
      redirectUrl.searchParams.set("error", "magic-link");
      return NextResponse.redirect(redirectUrl);
    }
  }

  const redirectPath = next && next.startsWith("/") ? next : "/app";

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}

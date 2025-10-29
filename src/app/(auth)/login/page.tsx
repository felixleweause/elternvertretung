import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { EmailLoginForm } from "@/components/auth/email-login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    error_description?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const rawNext = resolvedSearchParams.next;
  const nextPath =
    typeof rawNext === "string" && rawNext.startsWith("/") ? rawNext : "/app";

  if (user) {
    redirect(nextPath);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const magicLinkRedirect = siteUrl
    ? `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`
    : undefined;

  let initialStatus: "idle" | "success" | "error" = "idle";
  let initialMessage: string | null = null;

  const errorCode = resolvedSearchParams.error;
  const errorDescription = resolvedSearchParams.error_description;

  if (errorCode) {
    initialStatus = "error";
    switch (errorCode) {
      case "otp_expired":
      case "otp_session_missing":
        initialMessage =
          "Der Login-Link ist nicht mehr gültig. Bitte fordere einen neuen Link an.";
        break;
      case "magic-link":
        initialMessage =
          "Der Magic-Link konnte nicht eingelöst werden. Bitte versuche es erneut.";
        break;
      default:
        initialMessage =
          errorDescription ??
          "Die Anmeldung ist fehlgeschlagen. Bitte fordere einen neuen Link an.";
        break;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <EmailLoginForm
        redirectTo={magicLinkRedirect}
        nextPath={nextPath}
        initialStatus={initialStatus}
        initialMessage={initialMessage}
      />
    </div>
  );
}

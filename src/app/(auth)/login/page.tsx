import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { EmailLoginForm } from "@/components/auth/email-login-form";

export default async function LoginPage() {
  const supabase = await getServerSupabase();
  const [{ data: { session } }, { data: { user } }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const appPath = "/app";

  if (session && user) {
    redirect(appPath);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const magicLinkRedirect = siteUrl
    ? `${siteUrl}/auth/callback?next=${encodeURIComponent(appPath)}`
    : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <EmailLoginForm redirectTo={magicLinkRedirect} nextPath={appPath} />
    </div>
  );
}

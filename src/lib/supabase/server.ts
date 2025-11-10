import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import type { Database } from "./database";

type CookieAdapter = Pick<RequestCookies, "getAll"> & {
  set?: RequestCookies["set"];
};

export async function getServerSupabase(
  cookieAdapter?: CookieAdapter
): Promise<SupabaseClient<Database>> {
  const cookieStore = cookieAdapter ?? (await cookies());

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          if (typeof cookieStore.set !== "function") {
            return;
          }
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set?.(name, value, options);
            });
          } catch {
            // Ignore cookie setting errors in Server Components
          }
        },
      },
    }
  );
}

export function createReadOnlyCookieAdapter(
  cookiesToUse: ReturnType<RequestCookies["getAll"]>
): CookieAdapter {
  return {
    getAll() {
      return cookiesToUse;
    },
  };
}

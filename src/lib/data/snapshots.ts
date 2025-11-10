import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  loadAnnouncementsSnapshot,
  loadEventsSnapshot,
  loadPollsSnapshot,
  loadHomeSnapshot,
  type AnnouncementsSnapshot,
  type EventsSnapshot,
  type PollsSnapshot,
  type HomeSnapshot,
} from "@/lib/react-query/query-functions";
import { getSupabaseAccessToken } from "@/lib/supabase/auth-context";
import type { Database } from "@/lib/supabase/database";

const SHORT_REVALIDATE_SECONDS = 60;
const HOME_REVALIDATE_SECONDS = 90;

function getCachedSupabaseClient() {
  const accessToken = getSupabaseAccessToken();
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

export const getAnnouncementsSnapshot = unstable_cache(
  async (userId: string, schoolId: string): Promise<AnnouncementsSnapshot> => {
    const supabase = getCachedSupabaseClient();
    return loadAnnouncementsSnapshot(supabase, userId, { schoolId });
  },
  ["announcements-snapshot"],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
  }
);

export const getEventsSnapshot = unstable_cache(
  async (userId: string, schoolId: string): Promise<EventsSnapshot> => {
    const supabase = getCachedSupabaseClient();
    return loadEventsSnapshot(supabase, userId, { schoolId });
  },
  ["events-snapshot"],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
  }
);

export const getPollsSnapshot = unstable_cache(
  async (userId: string, schoolId: string): Promise<PollsSnapshot> => {
    const supabase = getCachedSupabaseClient();
    return loadPollsSnapshot(supabase, userId, { schoolId });
  },
  ["polls-snapshot"],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
  }
);

export const getHomeSnapshot = unstable_cache(
  async (userId: string, schoolId: string): Promise<HomeSnapshot> => {
    const supabase = getCachedSupabaseClient();
    return loadHomeSnapshot(supabase, userId, { schoolId });
  },
  ["home-snapshot"],
  {
    revalidate: HOME_REVALIDATE_SECONDS,
  }
);

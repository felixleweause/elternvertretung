"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useSupabaseClient,
  useUser,
} from "@supabase/auth-helpers-react";
import type { Database } from "@/lib/supabase/database";
import {
  announcementsKeys,
  eventsKeys,
  pollsKeys,
  homeKeys,
} from "@/lib/react-query/query-keys";
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

export function useAnnouncementsQuery() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery<AnnouncementsSnapshot>({
    queryKey: announcementsKeys.all,
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadAnnouncementsSnapshot(supabase, user.id);
    },
    enabled: Boolean(user),
  });
}

export function useEventsQuery() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery<EventsSnapshot>({
    queryKey: eventsKeys.all,
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadEventsSnapshot(supabase, user.id);
    },
    enabled: Boolean(user),
  });
}

export function usePollsQuery() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery<PollsSnapshot>({
    queryKey: pollsKeys.all,
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadPollsSnapshot(supabase, user.id);
    },
    enabled: Boolean(user),
  });
}

export function useHomeQuery() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery<HomeSnapshot>({
    queryKey: homeKeys.overview,
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadHomeSnapshot(supabase, user.id);
    },
    enabled: Boolean(user),
  });
}

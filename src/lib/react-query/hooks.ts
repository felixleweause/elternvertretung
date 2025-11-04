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
  userKeys,
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

export function useAnnouncementsQuery(schoolId: string) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery<AnnouncementsSnapshot>({
    queryKey: announcementsKeys.all(schoolId),
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadAnnouncementsSnapshot(supabase, user.id);
    },
    enabled: Boolean(user && schoolId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    networkMode: 'always',
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

export function useEventsQuery(schoolId: string) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery<EventsSnapshot>({
    queryKey: eventsKeys.all(schoolId),
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadEventsSnapshot(supabase, user.id);
    },
    enabled: Boolean(user && schoolId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    networkMode: 'always',
    placeholderData: (previousData) => previousData,
  });
}

export function usePollsQuery(schoolId: string) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery<PollsSnapshot>({
    queryKey: pollsKeys.all(schoolId),
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadPollsSnapshot(supabase, user.id);
    },
    enabled: Boolean(user && schoolId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    networkMode: 'always',
    placeholderData: (previousData) => previousData,
  });
}

export function useHomeQuery(schoolId: string) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery<HomeSnapshot>({
    queryKey: homeKeys.overview(schoolId),
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadHomeSnapshot(supabase, user.id);
    },
    enabled: Boolean(user && schoolId),
    staleTime: 5 * 60 * 1000, // 5 minutes - longer to respect bootstrap data
    gcTime: 10 * 60 * 1000, // 10 minutes
    networkMode: 'always',
    placeholderData: (previousData) => previousData,
  });
}

// User data hooks
export function useMeQuery() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => {
      if (!user) {
        throw new Error("auth_required");
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, school_id")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
    staleTime: 10 * 60 * 1000, // 10 minutes - respect bootstrap data
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useRolesQuery(schoolId: string) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery<string[]>({
    queryKey: userKeys.roles(schoolId),
    queryFn: async () => {
      if (!user) {
        throw new Error("auth_required");
      }
      const { data, error } = await supabase
        .from("mandates")
        .select("role")
        .eq("user_id", user.id)
        .eq("status", "active");
      
      if (error) throw error;
      return (data ?? []).map(m => m.role).filter(Boolean);
    },
    enabled: Boolean(user && schoolId),
    staleTime: 5 * 60 * 1000, // 5 minutes - respect bootstrap data
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useScopesQuery(schoolId: string) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  return useQuery({
    queryKey: userKeys.scopes(schoolId),
    queryFn: async () => {
      if (!user) {
        throw new Error("auth_required");
      }
      const { data, error } = await supabase
        .from("mandates")
        .select("scope_type, scope_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      
      if (error) throw error;
      
      const mandates = data ?? [];
      const schoolScopes = mandates.filter(m => m.scope_type === "school");
      const classScopes = mandates.filter(m => m.scope_type === "class");

      return {
        school: schoolScopes.length > 0,
        classes: classScopes.map(m => m.scope_id).filter(Boolean) as string[],
      };
    },
    enabled: Boolean(user && schoolId),
    staleTime: 5 * 60 * 1000, // 5 minutes - respect bootstrap data
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/components/providers/supabase-provider";
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
  const { supabase, user } = useSupabase();

  return useQuery<AnnouncementsSnapshot>({
    queryKey: announcementsKeys.all(schoolId),
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadAnnouncementsSnapshot(supabase as any, user.id, { schoolId });
    },
    enabled: Boolean(user && schoolId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    networkMode: 'offlineFirst', // Use cached data first, then network
    placeholderData: (previousData) => previousData, // Keep previous data while loading
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Only refetch on reconnect
  });
}

export function useEventsQuery(schoolId: string) {
  const { supabase, user } = useSupabase();

  return useQuery<EventsSnapshot>({
    queryKey: eventsKeys.all(schoolId),
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadEventsSnapshot(supabase as any, user.id, { schoolId });
    },
    enabled: Boolean(user && schoolId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    networkMode: 'offlineFirst', // Use cached data first, then network
    placeholderData: (previousData) => previousData,
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Only refetch on reconnect
  });
}

export function usePollsQuery(schoolId: string) {
  const { supabase, user } = useSupabase();

  return useQuery<PollsSnapshot>({
    queryKey: pollsKeys.all(schoolId),
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadPollsSnapshot(supabase as any, user.id, { schoolId });
    },
    enabled: Boolean(user && schoolId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    networkMode: 'offlineFirst', // Use cached data first, then network
    placeholderData: (previousData) => previousData,
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Only refetch on reconnect
  });
}

export function useHomeQuery(schoolId: string) {
  const { supabase, user } = useSupabase();

  return useQuery<HomeSnapshot>({
    queryKey: homeKeys.overview(schoolId),
    queryFn: () => {
      if (!user) {
        throw new Error("auth_required");
      }
      return loadHomeSnapshot(supabase as any, user.id, { schoolId });
    },
    enabled: Boolean(user && schoolId),
    staleTime: 10 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    networkMode: 'offlineFirst', // Use cached data first, then network
    placeholderData: (previousData) => previousData,
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Only refetch on reconnect
  });
}

// User data hooks
export function useMeQuery() {
  const { supabase, user } = useSupabase();

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
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useRolesQuery(schoolId: string) {
  const { supabase, user } = useSupabase();

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
      return (data ?? []).map((m: any) => m.role).filter(Boolean);
    },
    enabled: Boolean(user && schoolId),
    staleTime: 10 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
  });
}

export function useScopesQuery(schoolId: string) {
  const { supabase, user } = useSupabase();

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
      const schoolScopes = mandates.filter((m: any) => m.scope_type === "school");
      const classScopes = mandates.filter((m: any) => m.scope_type === "class");

      return {
        school: schoolScopes.length > 0,
        classes: classScopes.map((m: any) => m.scope_id).filter(Boolean) as string[],
      };
    },
    enabled: Boolean(user && schoolId),
    staleTime: 10 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
  });
}

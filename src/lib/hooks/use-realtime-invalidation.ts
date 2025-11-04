"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

type UseRealtimeInvalidationProps = {
  table: keyof Database["public"]["Tables"];
  filter?: {
    column?: string;
    value?: string;
  };
  queryKey: any[];
  events?: RealtimeEvent[];
  schoolId?: string;
};

export function useRealtimeInvalidation({
  table,
  filter,
  queryKey,
  events = ["INSERT", "UPDATE", "DELETE"],
  schoolId,
}: UseRealtimeInvalidationProps) {
  const queryClient = useQueryClient();
  const supabase = useSupabaseClient<Database>();

  useEffect(() => {
    if (!schoolId) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtime = () => {
      const channelName = `${table}_changes_${schoolId}`;
      
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table as string,
            filter: filter?.column && filter?.value 
              ? `${filter.column}=eq.${filter.value}`
              : undefined,
          },
          (payload) => {
            // Only invalidate if the event type matches our configured events
            if (events.includes(payload.eventType as RealtimeEvent)) {
              console.log(`Realtime ${payload.eventType} on ${table}:`, payload);
              
              // Invalidate the specific query key
              queryClient.invalidateQueries({
                queryKey,
                exact: false, // Also invalidate more specific keys
              });
              
              // Also invalidate related home data since it might show counts/summaries
              if (table !== "profiles" && table !== "mandates") {
                queryClient.invalidateQueries({
                  queryKey: ["home", "overview", schoolId],
                });
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log(`Realtime subscription active for ${table}`);
          } else if (status === "TIMED_OUT" || status === "CLOSED") {
            console.warn(`Realtime subscription for ${table} ended:`, status);
          }
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, queryClient, table, filter, queryKey, events, schoolId]);
}

// Specific hooks for common use cases
export function useAnnouncementsRealtime(schoolId: string) {
  const queryClient = useQueryClient();
  
  useRealtimeInvalidation({
    table: "announcements",
    queryKey: ["announcements", schoolId],
    schoolId,
  });

  useRealtimeInvalidation({
    table: "read_receipts",
    queryKey: ["announcements", schoolId],
    schoolId,
  });
}

export function useEventsRealtime(schoolId: string) {
  const queryClient = useQueryClient();
  
  useRealtimeInvalidation({
    table: "events",
    queryKey: ["events", schoolId],
    schoolId,
  });

  useRealtimeInvalidation({
    table: "rsvps",
    queryKey: ["events", schoolId],
    schoolId,
  });
}

export function usePollsRealtime(schoolId: string) {
  const queryClient = useQueryClient();
  
  useRealtimeInvalidation({
    table: "polls",
    queryKey: ["polls", schoolId],
    schoolId,
  });

  useRealtimeInvalidation({
    table: "votes",
    queryKey: ["polls", schoolId],
    schoolId,
  });

  useRealtimeInvalidation({
    table: "poll_candidates",
    queryKey: ["polls", schoolId],
    schoolId,
  });
}

export function useUserRealtime(schoolId: string) {
  useRealtimeInvalidation({
    table: "mandates",
    queryKey: ["user", "roles", schoolId],
    schoolId,
  });

  useRealtimeInvalidation({
    table: "enrollments",
    queryKey: ["user", "enrollments", schoolId],
    schoolId,
  });
}

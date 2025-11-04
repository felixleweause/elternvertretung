import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import type {
  AnnouncementsSnapshot,
  EventsSnapshot,
  PollsSnapshot,
  HomeSnapshot,
} from "@/lib/react-query/query-functions";
import {
  loadAnnouncementsSnapshot,
  loadEventsSnapshot,
  loadPollsSnapshot,
  loadHomeSnapshot,
} from "@/lib/react-query/query-functions";

type Supabase = SupabaseClient<Database>;

export type BootstrapData = {
  user: {
    id: string;
    email: string;
    name?: string;
    schoolId: string;
  };
  roles: string[];
  scopes: {
    school: boolean;
    classes: string[];
  };
  initialData: {
    announcements: AnnouncementsSnapshot;
    events: EventsSnapshot;
    polls: PollsSnapshot;
    home: HomeSnapshot;
  };
};

// Performance logging helper
function logPerformance(label: string, startTime: number) {
  const duration = performance.now() - startTime;
  console.log(`[BOOTSTRAP] ${label}: ${duration.toFixed(2)}ms`);
  return duration;
}

export async function getBootstrap(supabase: Supabase, userId: string): Promise<BootstrapData> {
  const totalStart = performance.now();
  
  // Get user profile
  const profileStart = performance.now();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, name, school_id")
    .eq("id", userId)
    .single();
  logPerformance("profile", profileStart);

  if (profileError || !profile?.school_id) {
    throw new Error("Failed to load user profile or school not found");
  }

  // Get active mandates
  const mandatesStart = performance.now();
  const { data: mandates, error: mandatesError } = await supabase
    .from("mandates")
    .select("scope_type, scope_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active");
  logPerformance("mandates", mandatesStart);

  if (mandatesError) {
    throw new Error("Failed to load user mandates");
  }

  // Extract roles and scopes
  const roles = (mandates ?? []).map(m => m.role).filter((role): role is Database["public"]["Enums"]["mandate_role"] => Boolean(role));
  const schoolScopes = (mandates ?? []).filter(m => m.scope_type === "school");
  const classScopes = (mandates ?? []).filter(m => m.scope_type === "class");

  const scopes = {
    school: schoolScopes.length > 0,
    classes: classScopes.map(m => m.scope_id).filter((scopeId): scopeId is string => Boolean(scopeId)),
  };

  // Load initial data in parallel with performance tracking
  const dataLoadStart = performance.now();
  const [announcements, events, polls, home] = await Promise.allSettled([
    loadAnnouncementsSnapshot(supabase, userId),
    loadEventsSnapshot(supabase, userId),
    loadPollsSnapshot(supabase, userId),
    loadHomeSnapshot(supabase, userId),
  ]);
  logPerformance("parallel_data_load", dataLoadStart);

  // Get results or provide fallbacks
  const announcementsResult = announcements.status === "fulfilled" ? announcements.value : {
    announcements: [],
    composerScopes: [],
    profileMissing: true,
  };
  
  const eventsResult = events.status === "fulfilled" ? events.value : {
    events: [],
    composerScopes: [],
    remindersAvailable: false,
    profileMissing: true,
  };
  
  const pollsResult = polls.status === "fulfilled" ? polls.value : {
    polls: [],
    composerScopes: [],
    profileMissing: true,
  };
  
  const homeResult = home.status === "fulfilled" ? home.value : {
    roles: [],
    nextSteps: [],
    highlights: [],
    classLabels: [],
    schoolName: null,
    profileMissing: true,
  };

  const totalDuration = logPerformance("bootstrap_total", totalStart);
  
  // Log metrics for monitoring
  console.log(`[BOOTSTRAP_METRICS] total_ms: ${totalDuration.toFixed(2)}, user_id: ${userId}, school_id: ${profile.school_id}`);

  return {
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      schoolId: profile.school_id,
    },
    roles,
    scopes,
    initialData: {
      announcements: announcementsResult,
      events: eventsResult,
      polls: pollsResult,
      home: homeResult,
    },
  };
}

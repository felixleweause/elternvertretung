import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import type {
  AnnouncementListItem,
  AnnouncementScopeOption,
} from "@/components/announcements/types";
import type {
  EventListItem,
  EventScopeOption,
} from "@/components/events/types";
import type { PollListItem, PollScopeOption } from "@/components/polls/types";
import {
  isReminderColumnMissing,
  logReminderColumnWarning,
} from "@/lib/supabase/reminder-support";
import {
  HIGHLIGHTS_BY_ROLE,
  NEXT_STEPS_BY_ROLE,
  type UserRole,
} from "@/lib/constants/home";

type Supabase = SupabaseClient<Database>;

export type AnnouncementsSnapshot = {
  announcements: AnnouncementListItem[];
  composerScopes: AnnouncementScopeOption[];
  profileMissing: boolean;
};

export type EventsSnapshot = {
  events: EventListItem[];
  composerScopes: EventScopeOption[];
  remindersAvailable: boolean;
  profileMissing: boolean;
};

export type PollsSnapshot = {
  polls: PollListItem[];
  composerScopes: PollScopeOption[];
  profileMissing: boolean;
};

export type HomeSnapshot = {
  roles: string[];
  nextSteps: string[];
  highlights: string[];
  classLabels: string[];
  schoolName: string | null;
  profileMissing: boolean;
};

type MandateRow = Database["public"]["Tables"]["mandates"]["Row"];

type SnapshotOptions = {
  schoolId?: string | null;
};

function buildAnnouncementScopes(
  mandates: MandateRow[],
  classMap: Map<string, string>,
  schoolId: string
): AnnouncementScopeOption[] {
  const scopes: AnnouncementScopeOption[] = [];

  const schoolGranted = mandates.some(
    (mandate) =>
      mandate.scope_type === "school" &&
      (mandate.role === "gev" || mandate.role === "admin")
  );

  if (schoolGranted) {
    scopes.push({
      scopeType: "school",
      scopeId: schoolId,
      label: "Gesamte Schule",
    });
  }

  mandates
    .filter(
      (mandate) =>
        mandate.scope_type === "class" &&
        ["class_rep", "class_rep_deputy"].includes(mandate.role ?? "")
    )
    .forEach((mandate) => {
      if (!mandate.scope_id) return;
      const label =
        classMap.get(mandate.scope_id) ?? "Klasse (unbekanntes Label)";
      scopes.push({
        scopeType: "class",
        scopeId: mandate.scope_id,
        label,
      });
    });

  return scopes;
}

function buildEventScopes(
  mandates: MandateRow[],
  classMap: Map<string, string>,
  schoolId: string
): EventScopeOption[] {
  const scopes: EventScopeOption[] = [];

  const schoolGranted = mandates.some(
    (mandate) =>
      mandate.scope_type === "school" &&
      (mandate.role === "gev" || mandate.role === "admin")
  );

  if (schoolGranted) {
    scopes.push({
      scopeType: "school",
      scopeId: schoolId,
      label: "Gesamte Schule",
    });
  }

  mandates
    .filter(
      (mandate) =>
        mandate.scope_type === "class" &&
        ["class_rep", "class_rep_deputy"].includes(mandate.role ?? "")
    )
    .forEach((mandate) => {
      if (!mandate.scope_id) return;
      const label =
        classMap.get(mandate.scope_id) ?? "Klasse (unbekanntes Label)";
      scopes.push({
        scopeType: "class",
        scopeId: mandate.scope_id,
        label,
      });
    });

  return scopes;
}

function buildPollScopes(
  mandates: MandateRow[],
  classMap: Map<string, string>,
  schoolId: string,
  allowAllClasses: boolean
): PollScopeOption[] {
  const scopes = new Map<string, PollScopeOption>();

  const addScope = (scope: PollScopeOption) => {
    const key = `${scope.scopeType}:${scope.scopeId}`;
    if (!scopes.has(key)) {
      scopes.set(key, scope);
    }
  };

  const schoolGranted = mandates.some(
    (mandate) =>
      mandate.scope_type === "school" &&
      (mandate.role === "gev" || mandate.role === "admin") &&
      mandate.status === "active"
  );

  if (schoolGranted) {
    addScope({
      scopeType: "school",
      scopeId: schoolId,
      label: "Gesamte Schule",
    });
  }

  mandates
    .filter(
      (mandate) =>
        mandate.scope_type === "class" &&
        ["class_rep", "class_rep_deputy"].includes(mandate.role ?? "") &&
        mandate.status === "active"
    )
    .forEach((mandate) => {
      if (!mandate.scope_id) return;
      const label =
        classMap.get(mandate.scope_id) ?? "Klasse (unbekanntes Label)";
      addScope({
        scopeType: "class",
        scopeId: mandate.scope_id,
        label,
      });
    });

  if (allowAllClasses) {
    for (const [classId, label] of classMap.entries()) {
      addScope({
        scopeType: "class",
        scopeId: classId,
        label,
      });
    }
  }

  return Array.from(scopes.values());
}

async function fetchClassMap(
  supabase: Supabase,
  classIds: string[]
): Promise<Map<string, string>> {
  if (classIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("classrooms")
    .select("id, name, year")
    .in("id", classIds);

  if (error) {
    console.error("Failed to load classrooms", error);
    return new Map();
  }

  return new Map(
    (data ?? []).map((clazz) => [
      clazz.id!,
      clazz.year ? `${clazz.name} · Jahrgang ${clazz.year}` : clazz.name!,
    ])
  );
}

async function fetchAllClassesForSchool(
  supabase: Supabase,
  schoolId: string
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("classrooms")
    .select("id, name, year")
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load classrooms for school", error);
    return new Map();
  }

  return new Map(
    (data ?? []).map((clazz) => [
      clazz.id!,
      clazz.year ? `${clazz.name} · Jahrgang ${clazz.year}` : clazz.name!,
    ])
  );
}

export async function loadAnnouncementsSnapshot(
  supabase: Supabase,
  userId: string,
  options: SnapshotOptions = {}
): Promise<AnnouncementsSnapshot> {
  const start = performance.now();
  
  const profilePromise = options.schoolId
    ? Promise.resolve({ data: { school_id: options.schoolId }, error: null })
    : supabase
        .from("profiles")
        .select("id, school_id")
        .eq("id", userId)
        .maybeSingle()
    
  const mandatesPromise = supabase
    .from("mandates")
    .select("scope_type, scope_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    
  // Optimized: No JOIN, minimal columns, LIMIT 15
  const announcementsPromise = supabase
    .from("announcements")
    .select(
      `
            id,
            school_id,
            scope_type,
            scope_id,
            title,
            body,
            pinned,
            created_at,
            created_by
      `
    )
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(15)
    
  // Simplified receipts query
  const receiptsPromise = supabase
    .from("read_receipts")
    .select("announcement_id")
    .eq("user_id", userId)
    
  const [profileResult, mandatesResponse, announcementsResponse, receiptsResponse] =
    await Promise.all([
      profilePromise,
      mandatesPromise,
      announcementsPromise,
      receiptsPromise,
    ]);

  console.log(`[QUERY] loadAnnouncementsSnapshot: ${(performance.now() - start).toFixed(2)}ms`);

  if (profileResult.error) {
    console.error("Failed to load profile for announcements snapshot", profileResult.error);
  }

  const profile = profileResult.data;

  if (!profile?.school_id) {
    return { announcements: [], composerScopes: [], profileMissing: true };
  }

  if (announcementsResponse.error) {
    console.error("Failed to load announcements", announcementsResponse.error);
  }

  const announcementsData = announcementsResponse.data ?? [];
  const readReceipts = receiptsResponse.data ?? [];

  const classIds = Array.from(
    new Set(
      announcementsData
        .filter((item: any) => item.scope_type === "class")
        .map((item: any) => item.scope_id!)
    )
  );

  const classMap = await fetchClassMap(supabase, classIds as string[]);
  const readSet = new Set(readReceipts.map((receipt: any) => receipt.announcement_id));

  const announcements: AnnouncementListItem[] = announcementsData.map((item: any) => ({
    id: item.id!,
    schoolId: item.school_id!,
    scopeType: item.scope_type!,
    scopeId: item.scope_id!,
    scopeLabel:
      item.scope_type === "school"
        ? "Gesamte Schule"
        : classMap.get(item.scope_id!) ?? "Klasse",
    title: item.title!,
    body: item.body ?? "",
    attachments: item.attachments ?? [],
    allowComments: item.allow_comments ?? false,
    requiresAck: item.requires_ack ?? false,
    pinned: item.pinned ?? false,
    createdAt: item.created_at!,
    createdBy: {
      id: item.profiles?.id ?? null,
      name: item.profiles?.name ?? null,
      email: item.profiles?.email ?? null,
    },
    isRead: readSet.has(item.id!),
  }));

  const composerScopes = mandatesResponse.data
    ? buildAnnouncementScopes(mandatesResponse.data as any, classMap, profile.school_id)
    : [];

  return { announcements, composerScopes, profileMissing: false };
}

export async function loadEventsSnapshot(
  supabase: Supabase,
  userId: string,
  options: SnapshotOptions = {}
): Promise<EventsSnapshot> {
  const start = performance.now();
  
  const windowStartDate = new Date();
  windowStartDate.setDate(windowStartDate.getDate() - 14);
  const windowStart = windowStartDate.toISOString();

  // Optimized: No JOIN, minimal columns, LIMIT 15
  const eventsSelection = supabase
    .from("events")
    .select(
      `
        id,
        school_id,
        scope_type,
        scope_id,
        title,
        description,
        start_at,
        end_at,
        location,
        remind_24h,
        created_at,
        created_by
      `
    )
    .gte("start_at", windowStart)
    .order("start_at", { ascending: true })
    .limit(15)
    
  const profilePromise = options.schoolId
    ? Promise.resolve({ data: { school_id: options.schoolId }, error: null })
    : supabase
        .from("profiles")
        .select("id, school_id")
        .eq("id", userId)
        .maybeSingle()
    
  const mandatesPromise = supabase
    .from("mandates")
    .select("scope_type, scope_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    
  const rsvpPromise = supabase
    .from("rsvps")
    .select("event_id, status")
    .eq("user_id", userId)
    
  const [profileResult, mandatesResponse, eventsResponse, rsvpResponse] =
    await Promise.all([
      profilePromise,
      mandatesPromise,
      eventsSelection,
      rsvpPromise,
    ]);

  console.log(`[QUERY] loadEventsSnapshot: ${(performance.now() - start).toFixed(2)}ms`);

  if (profileResult.error) {
    console.error("Failed to load profile for events snapshot", profileResult.error);
  }

  const profile = profileResult.data;

  if (!profile?.school_id) {
    return {
      events: [],
      composerScopes: [],
      remindersAvailable: true,
      profileMissing: true,
    };
  }

  let remindersAvailable = true;

  if (eventsResponse.error) {
    if (isReminderColumnMissing(eventsResponse.error)) {
      remindersAvailable = false;
      logReminderColumnWarning("list fetch");
    } else {
      console.error("Failed to load events", eventsResponse.error);
    }
  }

  let eventsData = eventsResponse.data ?? [];

  if (!remindersAvailable) {
    const fallback = await supabase
      .from("events")
      .select(
        `
          id,
          school_id,
          scope_type,
          scope_id,
          title,
          description,
          start_at,
          end_at,
          location,
          created_at,
          profiles (
            id,
            name,
            email
          )
        `
      )
      .gte("start_at", windowStart)
      .order("start_at", { ascending: true })
      .limit(50);

    if (!fallback.error) {
      eventsData = fallback.data as any ?? [];
    }
  }

  const classIds = Array.from(
    new Set(
      eventsData
        .filter((event: any) => event.scope_type === "class")
        .map((event: any) => event.scope_id!)
    )
  );

  const classMap = await fetchClassMap(supabase, classIds as string[]);

  const rsvpData = rsvpResponse.data ?? [];
  const rsvpMap = new Map<string, "yes" | "no" | "maybe">(
    rsvpData
      .filter(
        (row: any): row is { event_id: string; status: "yes" | "no" | "maybe" } =>
          row.status === "yes" || row.status === "no" || row.status === "maybe"
      )
      .map((row: any) => [row.event_id!, row.status!])
  );

  const events: EventListItem[] = eventsData.map((event: any) => ({
    id: event.id!,
    schoolId: event.school_id!,
    scopeType: event.scope_type!,
    scopeId: event.scope_id!,
    scopeLabel:
      event.scope_type === "school"
        ? "Gesamte Schule"
        : classMap.get(event.scope_id!) ?? "Klasse",
    title: event.title!,
    description: event.description,
    startAt: event.start_at!,
    endAt: event.end_at ?? null,
    location: event.location ?? null,
    remind24h: remindersAvailable ? event.remind_24h ?? false : false,
    remind2h: remindersAvailable ? event.remind_2h ?? false : false,
    createdAt: event.created_at!,
    createdBy: {
      id: event.profiles?.id ?? null,
      name: event.profiles?.name ?? null,
      email: event.profiles?.email ?? null,
    },
    rsvpStatus: rsvpMap.get(event.id!) ?? null,
  }));

  const composerScopes = mandatesResponse.data
    ? buildEventScopes(mandatesResponse.data as any, classMap, profile.school_id)
    : [];

  return { events, composerScopes, remindersAvailable, profileMissing: false };
}

export async function loadPollsSnapshot(
  supabase: Supabase,
  userId: string,
  options: SnapshotOptions = {}
): Promise<PollsSnapshot> {
  const start = performance.now();
  
  const profilePromise = options.schoolId
    ? Promise.resolve({ data: { school_id: options.schoolId }, error: null })
    : supabase
        .from("profiles")
        .select("id, school_id")
        .eq("id", userId)
        .maybeSingle()
    
  const mandatesPromise = supabase
    .from("mandates")
    .select("scope_type, scope_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    
  // Optimized: No JOIN, minimal columns, LIMIT 15
  const pollsPromise = supabase
    .from("polls")
    .select(
      `
          id,
          school_id,
          scope_type,
          scope_id,
          title,
          description,
          type,
          status,
          kind,
          deadline,
          created_at,
          created_by
      `
    )
    .order("created_at", { ascending: false })
    .limit(15)
    
  const [profileResult, mandatesResponse, pollsResponse] = await Promise.all([
    profilePromise,
    mandatesPromise,
    pollsPromise,
  ]);

  console.log(`[QUERY] loadPollsSnapshot: ${(performance.now() - start).toFixed(2)}ms`);

  if (profileResult.error) {
    console.error("Failed to load profile for polls snapshot", profileResult.error);
  }

  const profileData = profileResult.data;

  if (!profileData?.school_id) {
    return { polls: [], composerScopes: [], profileMissing: true };
  }

  if (pollsResponse.error) {
    console.error("Failed to load polls snapshot", pollsResponse.error);
  }

  const pollsData = pollsResponse.data ?? [];

  const classIds = Array.from(
    new Set(
      pollsData
        .filter((poll: any) => poll.scope_type === "class")
        .map((poll: any) => poll.scope_id!)
    )
  );

  const classMap = await fetchClassMap(supabase, classIds as string[]);

  const hasSchoolWideMandate =
    mandatesResponse.data?.some(
      (mandate: any) =>
        mandate.scope_type === "school" &&
        (mandate.role === "gev" || mandate.role === "admin") &&
        mandate.status === "active"
    ) ?? false;

  if (hasSchoolWideMandate) {
    const additionalClasses = await fetchAllClassesForSchool(
      supabase,
      profileData.school_id
    );
    for (const [classId, label] of additionalClasses.entries()) {
      classMap.set(classId, label);
    }
  }

  const summaryResults = await Promise.all(
    pollsData.map(async (poll: any) => {
      try {
        const { data, error } = await supabase.rpc("poll_vote_summary", {
          p_poll_id: poll.id,
        });
        if (error) {
          return { pollId: poll.id!, rows: [] as { choice: string; votes: number }[] };
        }
        return {
          pollId: poll.id!,
          rows: Array.isArray(data)
            ? (data as { choice: string; votes: number }[])
            : [],
        };
      } catch (err) {
        console.warn("Failed to load poll summary", err);
        return { pollId: poll.id!, rows: [] as { choice: string; votes: number }[] };
      }
    })
  );

  const summaryMap = new Map<string, { choice: string; votes: number }[]>();
  for (const { pollId, rows } of summaryResults) {
    summaryMap.set(pollId, rows);
  }

  const polls: PollListItem[] = pollsData.map((poll: any) => {
    const options = (poll.options as { id: string; label: string }[]) ?? [];
    const summaryRows = summaryMap.get(poll.id!) ?? [];
    const scopeLabel =
      poll.scope_type === "school"
        ? "Gesamte Schule"
        : classMap.get(poll.scope_id!) ?? "Klasse";

    const secretResultsHidden =
      poll.type === "secret" &&
      poll.status === "open" &&
      (poll.deadline === null || Date.parse(poll.deadline) > Date.now());

    const totalVotes = secretResultsHidden
      ? 0
      : summaryRows.reduce((acc, row) => acc + (row.votes ?? 0), 0);

    return {
      id: poll.id!,
      title: poll.title!,
      description: poll.description,
      scopeType: poll.scope_type!,
      scopeId: poll.scope_id!,
      scopeLabel,
      type: poll.type!,
      status: poll.status!,
      kind: poll.kind! as "general" | "election",
      deadline: poll.deadline ?? null,
      quorum: poll.quorum ?? null,
      allowAbstain: poll.allow_abstain ?? false,
      createdAt: poll.created_at!,
      createdBy: {
        id: poll.profiles?.id ?? null,
        name: poll.profiles?.name ?? null,
        email: poll.profiles?.email ?? null,
      },
      totalVotes,
      secretResultsHidden,
    };
  });

  const composerScopes = mandatesResponse.data
    ? buildPollScopes(
        mandatesResponse.data as any,
        classMap,
        profileData.school_id,
        hasSchoolWideMandate
      )
    : [];

  return { polls, composerScopes, profileMissing: false };
}

export async function loadHomeSnapshot(
  supabase: Supabase,
  userId: string,
  options: SnapshotOptions = {}
): Promise<HomeSnapshot> {
  const profilePromise = options.schoolId
    ? Promise.resolve({ data: { school_id: options.schoolId, name: null }, error: null })
    : supabase
        .from("profiles")
        .select("id, school_id, name")
        .eq("id", userId)
        .maybeSingle();

  const [enrollmentResult, profileResult, mandatesResult] = await Promise.all([
    supabase.from("enrollments").select("id").limit(1).maybeSingle(),
    profilePromise,
    supabase
      .from("mandates")
      .select("scope_type, scope_id, role")
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  if (enrollmentResult.error) {
    console.error("Failed to load enrollment info", enrollmentResult.error);
  }

  const enrollment = enrollmentResult.data;
  if (!enrollment) {
    return {
      roles: [],
      nextSteps: [],
      highlights: [],
      classLabels: [],
      schoolName: null,
      profileMissing: true,
    };
  }

  if (mandatesResult.error) {
    console.error("Failed to load mandates for overview", mandatesResult.error);
  }

  const mandates = mandatesResult.data ?? [];
  const roleSet = new Set<UserRole>();

  if (mandates.some((mandate) => mandate.role === "admin")) {
    roleSet.add("admin");
  }
  if (mandates.some((mandate) => mandate.role === "gev")) {
    roleSet.add("gev");
  }
  if (
    mandates.some(
      (mandate) =>
        mandate.role === "class_rep" || mandate.role === "class_rep_deputy"
    )
  ) {
    roleSet.add("class_rep");
  }
  roleSet.add("parent");

  const userRoles = Array.from(roleSet);

  const classMandateIds = Array.from(
    new Set(
      mandates
        .filter(
          (mandate) =>
            mandate.scope_type === "class" &&
            (mandate.role === "class_rep" ||
              mandate.role === "class_rep_deputy")
        )
        .map((mandate) => mandate.scope_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const classMap = await fetchClassMap(supabase, classMandateIds);
  const classLabels = Array.from(classMap.values());

  let schoolName: string | null = null;
  if (profileResult.data?.school_id) {
    const { data: schoolRow, error: schoolError } = await supabase
      .from("schools")
      .select("name")
      .eq("id", profileResult.data.school_id)
      .maybeSingle();
    if (schoolError) {
      console.error("Failed to load school name for overview", schoolError);
    }
    schoolName = schoolRow?.name ?? null;
  }

  const nextSteps: string[] = [];
  const highlights: string[] = [];

  for (const role of userRoles) {
    for (const step of NEXT_STEPS_BY_ROLE[role]) {
      if (!nextSteps.includes(step)) {
        nextSteps.push(step);
      }
    }
    for (const highlight of HIGHLIGHTS_BY_ROLE[role]) {
      if (!highlights.includes(highlight)) {
        highlights.push(highlight);
      }
    }
  }

  return {
    roles: userRoles,
    nextSteps,
    highlights,
    classLabels,
    schoolName,
    profileMissing: false,
  };
}

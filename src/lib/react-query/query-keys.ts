export const announcementsKeys = {
  all: (schoolId: string) => ["announcements", schoolId] as const,
  lists: () => ["announcements", "list"] as const,
  list: (schoolId: string, filters: string) => ["announcements", "list", schoolId, filters] as const,
  details: () => ["announcements", "detail"] as const,
  detail: (id: string) => ["announcements", "detail", id] as const,
};

export const eventsKeys = {
  all: (schoolId: string) => ["events", schoolId] as const,
  lists: () => ["events", "list"] as const,
  list: (schoolId: string, filters: string) => ["events", "list", schoolId, filters] as const,
  details: () => ["events", "detail"] as const,
  detail: (id: string) => ["events", "detail", id] as const,
  rsvps: (eventId: string) => ["events", "detail", eventId, "rsvps"] as const,
};

export const pollsKeys = {
  all: (schoolId: string) => ["polls", schoolId] as const,
  lists: () => ["polls", "list"] as const,
  list: (schoolId: string, filters: string) => ["polls", "list", schoolId, filters] as const,
  details: () => ["polls", "detail"] as const,
  detail: (id: string) => ["polls", "detail", id] as const,
  votes: (pollId: string) => ["polls", "detail", pollId, "votes"] as const,
  candidates: (pollId: string) => ["polls", "detail", pollId, "candidates"] as const,
};

export const homeKeys = {
  overview: (schoolId: string) => ["home", "overview", schoolId] as const,
};

export const userKeys = {
  all: ["user"] as const,
  me: ["user", "me"] as const,
  roles: (schoolId: string) => ["user", "roles", schoolId] as const,
  scopes: (schoolId: string) => ["user", "scopes", schoolId] as const,
  mandates: (schoolId: string) => ["user", "mandates", schoolId] as const,
  enrollments: (schoolId: string) => ["user", "enrollments", schoolId] as const,
};

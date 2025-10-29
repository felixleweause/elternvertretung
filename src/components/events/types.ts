export type EventScopeOption = {
  scopeType: "class" | "school";
  scopeId: string;
  label: string;
};

export type EventListItem = {
  id: string;
  schoolId: string;
  scopeType: "class" | "school";
  scopeId: string;
  scopeLabel: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  remind24h: boolean;
  remind2h: boolean;
  createdAt: string;
  createdBy: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  rsvpStatus: EventRsvpStatus | null;
};

export type EventDetail = {
  id: string;
  schoolId: string;
  scopeType: "class" | "school";
  scopeId: string;
  scopeLabel: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  remind24h: boolean;
  remind2h: boolean;
  createdAt: string;
  createdBy: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  rsvpStatus: EventRsvpStatus | null;
  canManage: boolean;
  attendeeCount?: {
    yes: number;
    no: number;
    maybe: number;
  } | null;
  agenda: EventAgendaDocument;
  minutes: EventMinutesDocument;
  agendaAvailable: boolean;
};

export type EventRsvpStatus = "yes" | "no" | "maybe";

export type EventAgendaItem = {
  id: string;
  topic: string;
  owner: string | null;
  startsAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
};

export type EventAgendaDocument = {
  items: EventAgendaItem[];
  updatedAt: string | null;
  preparedBy: string | null;
};

export type EventMinutesEntry = {
  id: string;
  note: string;
  recordedAt: string;
  agendaItemId: string | null;
  author: string | null;
};

export type EventMinutesDocument = {
  entries: EventMinutesEntry[];
  updatedAt: string | null;
  preparedBy: string | null;
};

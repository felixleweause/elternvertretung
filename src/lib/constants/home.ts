import type { ComponentType } from "react";
import {
  CalendarCheck,
  Megaphone,
  Vote,
} from "lucide-react";

export type UserRole = "parent" | "class_rep" | "gev" | "admin";

export const ROLE_LABELS: Record<UserRole, string> = {
  parent: "Elternteil",
  class_rep: "Klassenvertretung",
  gev: "Schulelternvertretung",
  admin: "Administrator:in",
};

export const NEXT_STEPS_BY_ROLE: Record<UserRole, string[]> = {
  parent: [
    "Neue Ankündigungen und Termine deiner Klassen prüfen.",
    "RSVPs aktuell halten und Materialien herunterladen.",
  ],
  class_rep: [
    "Elternabende planen und Agenda/Protokoll vorbereiten.",
    "Ankündigungen mit Lesebestätigung an die Klasse senden.",
    "Klassenmandate und Stellvertretungen im Blick behalten.",
  ],
  gev: [
    "Schulweite Umfragen vorbereiten und Ergebnisse koordinieren.",
    "Mandats-Übergaben mit Klassenvertretungen abstimmen.",
  ],
  admin: [
    "Schulweite Mandate und Rollen verwalten.",
    "Standard-Templates und Aufgaben-Workflows definieren.",
    "Audit-Log regelmäßig auf neue Einträge prüfen.",
  ],
};

export const HIGHLIGHTS_BY_ROLE: Record<UserRole, string[]> = {
  parent: [
    "Alle Dokumente stehen als PDF-Export in den Termin-Details bereit.",
    "RSVP-Antworten lassen sich jederzeit anpassen – auch nach dem Versand.",
  ],
  class_rep: [
    "Agenda & Protokoll sichern automatisch Audit-Einträge für spätere Übergaben.",
    "Termine erinnern optional T-24h/T-2h per E-Mail – einfach beim Anlegen aktivieren.",
  ],
  gev: [
    "Verdeckte Umfragen zeigen Ergebnisse erst nach Fristablauf – ideal für geheime Abstimmungen.",
    "Mandats-RLS verhindert Änderungen durch andere Schulen automatisch.",
  ],
  admin: [
    "Das Storage-Bucket `docs` ist geschützt – nur Event-Manager:innen schreiben darauf.",
    "Alle kritischen Aktionen landen im Audit-Log und lassen sich exportieren.",
  ],
};

export const QUICK_ACTIONS: Array<{
  roles: UserRole[];
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    roles: ["parent", "class_rep", "gev", "admin"],
    label: "Ankündigungen ansehen",
    description: "Neuigkeiten und Beschlüsse deiner Gruppen",
    href: "/app/announcements",
    icon: Megaphone,
  },
  {
    roles: ["parent", "class_rep", "gev", "admin"],
    label: "Termine ansehen",
    description: "Elternabende & Veranstaltungen im Blick behalten",
    href: "/app/events",
    icon: CalendarCheck,
  },
  {
    roles: ["class_rep", "gev", "admin"],
    label: "Ankündigung verfassen",
    description: "Nachrichten mit Lesebestätigung versenden",
    href: "/app/announcements",
    icon: Megaphone,
  },
  {
    roles: ["class_rep", "gev", "admin"],
    label: "Termin planen",
    description: "Agenda pflegen & RSVP einholen",
    href: "/app/events",
    icon: CalendarCheck,
  },
  {
    roles: ["gev", "admin"],
    label: "Umfrage starten",
    description: "Mandatsbasierte Abstimmung anlegen",
    href: "/app/polls",
    icon: Vote,
  },
];

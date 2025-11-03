## MCP: contex7 und superbase
**Ziel:** Schlanke, DSGVO-feste App für Eltern- und Schulelternvertretungen. **Backend:** Supabase (Auth/DB/Storage, RLS). **Auth:** Magic-Link. **GEV darf Klassen-Mandate verwalten.**



## 1) Scope (MVP)

* Rollen & Mandate: Eltern, Klassenelternvertreter:in (+Stellv.), GEV, Admin; Start/Ende; Übergabe zum Schuljahreswechsel.
* Onboarding: Klassen-Code/QR + Magic-Link; Minimaldaten (Name, Klasse, optional Kind-Kürzel).
* Ankündigungen: pro Klasse/Schule; Lesebestätigung; Kommentare optional/moderiert.
* Termine: RSVP (Ja/Nein/Vielleicht), iCal-Export, Erinnerungen; Agenda → Protokoll (PDF).
* Umfragen: offen/verdeckt, Frist, Quorum; 1 Stimme/Klasse via Mandat; Ergebnisexport.
* Dokumente/Vorlagen: Templates, Versionierung, PDF-Export.
* Aufgaben/Mitbringen: To-Dos pro Termin, Verantwortliche, Fälligkeiten.
* DSGVO: EU-Region, Datenminimierung, Self-Export/Löschung, Audit-Log.

---

## 2) Architektur (knapp)

* Frontend: Next.js (App Router, PWA), TypeScript, Tailwind/shadcn.
* Supabase: Postgres, Auth (Magic-Link), Storage (`docs`), Edge Functions; RLS aktiv.
* Multi-Tenant: `school_id` in Session/JWT (Subdomain → Schule).

---

## 3) RBAC (Kern)

| Fähigkeit                                  | Eltern | Klassen-Vertretung | GEV | Admin |
| ------------------------------------------ | :----: | :----------------: | :-: | :---: |
| Ankündigung lesen (Klasse)                 |    ✔   |          ✔         |  ✔  |   ✔   |
| Ankündigung posten (Klasse)                |        |          ✔         |     |   ✔   |
| Ankündigung posten (Schule)                |        |                    |  ✔  |   ✔   |
| Kommentare moderieren                      |        |          ✔         |  ✔  |   ✔   |
| Termine anlegen (Klasse)                   |        |          ✔         |     |   ✔   |
| Umfragen starten (Schule)                  |        |                    |  ✔  |   ✔   |
| **Klassen-Mandate verwalten (Rep/Deputy)** |        |                    |  ✔  |   ✔   |
| Schulweite Rollen/Mandate verwalten        |        |                    |     |   ✔   |

**GEV-Grenzen:** nur eigene Schule; nur `class_rep`, `class_rep_deputy`.

---

## 4) Datenmodell (Minimal)

* **schools**: id, name, subdomain, school_year_end_at
* **classrooms**: id, school_id, name, year
* **profiles**: id(auth), school_id, email, name, locale
* **enrollments**: id, user_id, classroom_id, child_initials?
* **mandates**: id, user_id, scope_type(class|school), scope_id, role(class_rep|class_rep_deputy|gev|admin), start_at, end_at, status(active|scheduled|ended), created_by, updated_by, reason
* **announcements**: id, scope_type, scope_id, title, body, attachments, created_by, created_at
* **read_receipts**: id, announcement_id, user_id, read_at
* **events**: id, scope_type, scope_id, title, start_at, end_at, location, agenda
* **rsvps**: id, event_id, user_id, status(yes|no|maybe), at
* **polls**: id, scope_type, scope_id, title, type(open|secret), deadline, quorum, mandate_rule
* **votes**: id, poll_id, voter_id, choice, class_weight?
* **templates**: id, key, version, content, created_by, created_at
* **tasks**: id, event_id, title, assignee_id?, due_at, status
* **audit_log**: id, actor_id, action, entity, entity_id, meta, at
* **class_codes**: id, school_id, classroom_id, code, expires_at, uses_remaining

**Konsistenz:** pro Klasse max. 1 aktiver `class_rep` + 1 `class_rep_deputy`. `end_at ≤ school_year_end_at`.

---

## 5) Kern-Flows

* **Onboarding:** QR/Code → Magic-Link → `enrollments` anlegen → Klasse sichtbar.
* **Elternabend:** Event + RSVP → Agenda → Protokoll-PDF (Storage).
* **Umfrage:** (offen/verdeckt) + Frist + Quorum → Stimmen nach Mandat zählen → Export.
* **Schuljahreswechsel:** Assistent/Function → Mandate enden/übergeben → Klassen aufsteigen.
* **GEV-Mandate:** Klassenliste → Übergabe-Wizard → Benachrichtigung + Audit.

---

## 6) Tickets (priorisiert)

1. ✅ `db:init` (Tabellen/Enums/Indizes, RLS an)
2. ✅ `db:policies-mandates` (GEV darf Klassen-Mandate create/update/end/transfer)
3. ✅ `feat:ui-shell+auth` (Landing, Login, App-Layout, Guarding) ← NEU vor Onboarding
# plan.md — Elternvertretungs-App (Tickets 2–11, Supabase)

**Prämissen:**
Frontend: Next.js (App Router, PWA), Tailwind/shadcn.
Backend: Supabase (Postgres/Auth/Storage, RLS), EU-Region.
Tenant: `school_id` (Subdomain).

1. `db:init` ✅

---

## 2) `db:policies-mandates`✅

**Ziel:** GEV verwaltet Klassen-Mandate, sicher per RLS.
**Deliverables:** RLS-Policies (create/update/end/transfer nur GEV, gleiche Schule), Einzigartigkeit `class_rep`/`class_rep_deputy` je Klasse, Validierung `end_at ≤ school_year_end_at`, Audit-Events.
**AK:** GEV kann Klassen-Mandate ändern; keine GEV/Admin-Vergaben; Fremd-Schule=403.

## 3) `feat:ui-shell+auth`✅ (Landing, Login, App-Layout, Guarding)

## 4) `feat:onboarding + UI + backend` ✅

**UI:** `/join` (Code), `/join/success`, QR-Poster-Generator.
**Backend:** Code einlösen (Edge Function), `enrollments` anlegen, Poster-PDF in Storage, Rate-Limit, Audit.
**AK:** Code→Mail→Login→Klasse sichtbar; Poster downloadbar.

## 5) `feat:announcements + UI + backend` ✅

**UI:** Liste/Filter, Composer, Detail, Kommentare togglebar, Seen-Badges.
**Backend:** `announcements`, `read_receipts`, optionale `comments`, Attachments (signed URLs), optional Digest.
**AK:** Lesestatus sichtbar; Kommentare per Post an/aus; Anhänge laden.

## 6) `feat:events + UI + backend`✅

**UI:** Eventliste, Formular, Detail mit RSVP-Chips, `.ics`-Download, Reminder-Switch.
**Backend:** `events`, `rsvps`, iCal-Export (Server Action), Reminder (T-24h/T-2h).
**AK:** RSVP live; iCal Download; Reminder versendet.

## 7) `feat:agenda-protocol + UI + backend` ✅

**UI:** Event-Tab „Agenda/Protokoll“: Editor, Zeitstempel, PDF-Export.
**Backend:** `events.agenda/minutes` (jsonb), PDF aus Template in Storage, Snapshot im Audit.
**AK:** Agenda bearbeitbar; Protokoll gespeichert; Downloadlink vorhanden.

## 8) `feat:polls + UI + backend` ✅

**UI:** Übersicht, Wizard (offen/verdeckt, Frist, Quorum), Detail (Vote/Ergebnis) → umgesetzt: `/app/polls` mit Composer, Liste und Detailseite inkl. Voting-Panel & Ergebnisanzeige.
**Backend:** `polls`, `votes`, 1 Stimme/Klasse (Constraint/Guard), verdeckt = nur Aggregat bis Deadline, Close-Job → umgesetzt per Migration `20241028150000_polls_feature`, RLS/Helper-Functions, API-Routen (`/api/polls`, `/api/polls/[id]`, `/api/polls/[id]/vote`).
**AK erfüllt:** Mandats-RLS greift (Vote nur mit aktivem Mandat), verdeckte Umfragen zeigen bis zum Abschluss keine Einzelstimmen, Tests für Options-Normalisierung vorhanden.
**Restliche To-Dos:** CSV/PDF-Export der Ergebnisse, optionaler Auto-Close-Job nach Fristende.

## 9) `feat:templates + UI + backend`

**UI:** Template-Library, Editor mit Token-Preview, Version-Timeline.
**Backend:** `templates` (key/version/scope), Token-Validator, Standard-Vorlage pro Scope.
**AK:** Version anlegen/restore; Tokens korrekt; Standard setzen.

## 10) `feat:tasks + UI + backend`

**UI:** Event-Tab „Aufgaben“: Liste, Self-assign, Due-Picker, Status-Toggle, „Mitbringen“-Presets.
**Backend:** `tasks` mit RLS (Ersteller/Assignee, Moderation durch Klassen-Vertretung), Reminder T-1.
**AK:** Claim/Unclaim; Fälligkeit/Status live; Reminder versendet.

## 11) `feat:privacy + UI + backend`




---

## 7) Meilensteine

* **M1:** Auth/Onboarding · Ankündigungen · Termine+RSVP · Basis-RLS
* **M2:** Agenda→PDF · Templates · Aufgaben
* **M3:** Umfragen (Mandat) · Export/Löschung · Audit-Log · Schuljahreswechsel

---

## 8) Qualität & DSGVO (kurz)

* RLS-Tests (GEV nur Klassen-Mandate; Tenant-Isolation per `school_id`).
* Datenminimierung (keine Schüler-Klar­namen).
* Self-Service Export/Löschung; Audit-Log append-only.
* A11y-Basics, Web-Push optional als Digest.

---

## Dev-Test-Accounts

* `rep@example.com` / `Passwort123!` – Klassenvertretung, verknüpfbar mit Klassenflows.
* `parent@example.com` / `Passwort456!` – Elternrolle zum Gegencheck von RLS/RSVP.
* `election-test@example.com` / `UkoO+nhBDLvtmIUu` – GEV (Schule `Muster-Schule`), kann Klassenwahlen & Kandidaten-Codes anlegen.

# Elternvertretungs-App

Multi-Tenant Web-App für Klassen- und Gesamtelternvertretungen: onboarding per Klassen-Code/QR + Magic-Link, Ankündigungen, Termine mit RSVP & iCal, Umfragen (mandatsbasiert), Agenda→Protokoll-PDF, Vorlagen, Aufgaben – DSGVO-sauber mit RLS, Audit-Log und EU-Region.

## Inhalt

* [Ziele & Scope](#ziele--scope)
* [Architektur](#architektur)
* [Rollen, Mandate & RBAC](#rollen-mandate--rbac)
* [Datenmodell (Minimal)](#datenmodell-minimal)
* [Kern-Flows](#kern-flows)
* [Setup & Entwicklung](#setup--entwicklung)
* [Konfiguration](#konfiguration)
* [Dev-Daten & Test-Accounts](#dev-daten--test-accounts)
* [Qualität, Sicherheit & DSGVO](#qualität-sicherheit--dsgvo)
* [Roadmap / Meilensteine](#roadmap--meilensteine)
* [Ordnerstruktur (Vorschlag)](#ordnerstruktur-vorschlag)

---

## Ziele & Scope

**MVP-Funktionsumfang**

* **Rollen & Mandate:** Eltern, Klassenelternvertreter:in (+ Stellvertretung), GEV, Admin; Start/Ende; Übergabe zum Schuljahreswechsel.
* **Onboarding:** Klassen-Code/QR + Magic-Link; Minimaldaten (Name, Klasse, optional Kind-Kürzel).
* **Ankündigungen:** pro Klasse/Schule; Lesebestätigung; optional/moderierte Kommentare.
* **Termine:** RSVP (Ja/Nein/Vielleicht), iCal-Export, Erinnerungen; Agenda → Protokoll (PDF).
* **Umfragen:** offen/verdeckt, Frist, Quorum; 1 Stimme/Klasse via Mandat; Ergebnis-Export.
* **Dokumente/Vorlagen:** Templates, Versionierung, PDF-Export.
* **Aufgaben/Mitbringen:** To-Dos pro Termin, Verantwortliche, Fälligkeiten.
* **DSGVO:** EU-Region, Datenminimierung, Self-Export/Löschung, Audit-Log.

---

## Architektur

* **Frontend:** Next.js (App Router, PWA), TypeScript, Tailwind + shadcn/ui.
* **Backend:** Supabase (Postgres, Auth/Magic-Link, Storage `docs`, Edge Functions), **RLS aktiv**.
* **Multi-Tenant:** `school_id` im JWT/Session (Subdomain → Schule).
* **PDF/ICS:** Server Actions/Route Handlers erzeugen `.pdf` und `.ics` on-the-fly; PDFs werden in Storage abgelegt.

---

## Rollen, Mandate & RBAC

**Rollen (Deutsch):**

* **Elternteil**
* **Klassenelternvertreter:in (Klassensprecher:in Eltern)**
* **Stellvertretung Klassenelternvertretung**
* **GEV (Gesamtelternvertretung)**
* **Administrator:in**

**Mandats-Regeln:**
pro Klasse max. **1 aktives** Mandat `class_rep` + **1 aktives** `class_rep_deputy`; `end_at ≤ school_year_end_at`.

**RBAC-Matrix (Kern)**

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

## Datenmodell (Minimal)

* **schools**: `id`, `name`, `subdomain`, `school_year_end_at`
* **classrooms**: `id`, `school_id`, `name`, `year`
* **profiles**: `id(auth)`, `school_id`, `email`, `name`, `locale`
* **enrollments**: `id`, `user_id`, `classroom_id`, `child_initials?`
* **mandates**: `id`, `user_id`, `scope_type(class|school)`, `scope_id`, `role(class_rep|class_rep_deputy|gev|admin)`, `start_at`, `end_at`, `status(active|scheduled|ended)`, `created_by`, `updated_by`, `reason`
* **announcements**: `id`, `scope_type`, `scope_id`, `title`, `body`, `attachments`, `created_by`, `created_at`
* **read_receipts**: `id`, `announcement_id`, `user_id`, `read_at`
* **events**: `id`, `scope_type`, `scope_id`, `title`, `start_at`, `end_at`, `location`, `agenda`
* **rsvps**: `id`, `event_id`, `user_id`, `status(yes|no|maybe)`, `at`
* **polls**: `id`, `scope_type`, `scope_id`, `title`, `type(open|secret)`, `deadline`, `quorum`, `mandate_rule`
* **votes**: `id`, `poll_id`, `voter_id`, `choice`, `class_weight?`
* **templates**: `id`, `key`, `version`, `content`, `created_by`, `created_at`
* **tasks**: `id`, `event_id`, `title`, `assignee_id?`, `due_at`, `status`
* **audit_log**: `id`, `actor_id`, `action`, `entity`, `entity_id`, `meta`, `at`
* **class_codes**: `id`, `school_id`, `classroom_id`, `code`, `expires_at`, `uses_remaining`

**Konsistenz:** pro Klasse max. 1 aktiver `class_rep` + 1 `class_rep_deputy`; `end_at ≤ school_year_end_at`.

---

## Kern-Flows

* **Onboarding:** QR/Code → Magic-Link → `enrollments` anlegen → Klasse sichtbar.
* **Elternabend:** Event + RSVP → Agenda → Protokoll-PDF (Storage).
* **Umfrage:** offen/verdeckt + Frist + Quorum → Stimmen nach Mandat zählen → Export.
* **Schuljahreswechsel:** Assistent/Function → Mandate enden/übergeben → Klassen aufsteigen.
* **GEV-Mandate:** Klassenliste → Übergabe-Wizard → Benachrichtigung + Audit.

---

## Setup & Entwicklung

### Voraussetzungen

* Node.js ≥ 20
* pnpm oder npm
* Supabase-CLI (EU-Region wählen)
* Git, OpenSSL/Python (für einige PDF/ICS-Deps je nach Umsetzung)

### Lokale Entwicklung

1. **Repo klonen & deps installieren**

   ```bash
   pnpm install   # oder: npm install
   ```

2. **Supabase lokal starten**

   ```bash
   supabase init     # falls noch nicht vorhanden
   supabase start
   supabase db reset # wendet Migrations + Seeds an (falls konfiguriert)
   ```

3. **Env anlegen (`.env.local`)**

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_TENANT_MODE=subdomain
   NEXT_PUBLIC_STORAGE_BUCKET_DOCS=docs
   ```

4. **Dev-Server starten**

   ```bash
   pnpm dev   # oder: npm run dev
   ```

5. **Login testen (Magic-Link)**
   Auth per Supabase; Magic-Link landet in der Dev-Inbox (Studio) oder via eigenem SMTP.

### Deployment (Beispiel)

* **Frontend:** Vercel (Edge-ready, App Router).
* **Backend:** Supabase (EU-Region).
* **Konfiguration:** Produktive Keys als Projekt-Umgebungsvariablen setzen; Domain mit Subdomain-Wildcard (z. B. `*.example.school`).

---

## Konfiguration

**Multi-Tenant**

* Subdomain → `school_id` (Lookup).
* Lokaler Fallback: optional `?school=`-Query für Tests ohne Wildcard-DNS.

**Storage**

* Bucket `docs` für Protokolle/PDFs; Zugriff per signierten URLs.

**RLS & Policies**

* Tenant-Isolierung via `school_id` im JWT.
* GEV darf **nur** Klassen-Mandate (`class_rep`, `class_rep_deputy`) der **eigenen Schule** anlegen/ändern/beenden/übergeben.
* Einzigartigkeit der aktiven Klassenmandate durch Constraints + Guards.

**Erinnerungen & Jobs**

* Erinnerungen T-24h/T-2h (Termine).
* Auto-Close von verdeckten Umfragen nach `deadline` (Cron/Edge-Function).

**iCal/PDF**

* `.ics` wird serverseitig erzeugt (Route Handler), Protokoll-PDF aus Template (Storage-Snapshot + Audit).

---

## Dev-Daten & Test-Accounts

* `rep@example.com` / `Passwort123!` – Klassenvertretung (für Klassen-Flows geeignet)
* `parent@example.com` / `Passwort456!` – Elternrolle (RLS/RSVP gegenprüfen)

> Hinweis: Für Magic-Link-Login entweder SMTP konfigurieren oder Supabase Studio Dev-Inbox nutzen.

---

## Qualität, Sicherheit & DSGVO

* **RLS-Tests:** GEV nur Klassen-Mandate; strikte Tenant-Isolierung.
* **Datenminimierung:** keine Schüler-Klar­namen – optional nur Initialen (`child_initials`).
* **Self-Service:** Daten-Export & -Löschung für Nutzer.
* **Audit-Log:** append-only; erfasst relevante Aktionen (Mandatswechsel, Umfrage-Close, PDF-Snapshots).
* **EU-Region:** Supabase-Projekt in der EU; Backups gemäß Anbieter.
* **A11y:** Grundlegende Barrierefreiheit; Web-Push optional als Digest.

---

## Roadmap / Meilensteine

**Erledigt**

* `db:init` (Tabellen/Enums/Indizes, RLS an) ✅
* `db:policies-mandates` (GEV verwaltet Klassen-Mandate, RLS/Guards) ✅
* `feat:ui-shell+auth` (Landing, Login, App-Layout, Guarding) ✅
* `feat:onboarding + UI + backend` (Code, QR-Poster, Edge Function, Audit) ✅
* `feat:announcements + UI + backend` (Liste/Composer/Detail, Seen-Badges, Attachments) ✅
* `feat:events + UI + backend` (RSVP, iCal-Export, Reminder) ✅
* `feat:agenda-protocol + UI + backend` (Editor, PDF-Export, Audit-Snapshot) ✅
* `feat:polls + UI + backend` (offen/verdeckt, Frist, Quorum, 1 Stimme/Klasse, Detail & Ergebnis) ✅

**In Arbeit / Nächstes**

* `feat:templates + UI + backend` (Library, Versionierung, Token-Preview, Standard-Vorlage)
* `feat:tasks + UI + backend` (Event-Aufgaben, Self-Assign, Reminder T-1)
* `feat:privacy + UI + backend` (Self-Export/Löschung, Admin-Export, Logs)

**Meilensteine**

* **M1:** Auth/Onboarding · Ankündigungen · Termine+RSVP · Basis-RLS
* **M2:** Agenda→PDF · Templates · Aufgaben
* **M3:** Umfragen (Mandat) · Export/Löschung · Audit-Log · Schuljahreswechsel

---

## Ordnerstruktur (Vorschlag)

```
/app
  /(public)        # Marketing/Landing
  /(app)           # Auth-Guarded App
    /app
      page.tsx
      /announcements
      /events
      /polls
      /join
/lib
  /db              # Query-Functions, RLS-Helpers
  /pdf             # Templates/Renderer
  /ical            # ICS-Generator
  /auth            # Supabase-Client/Server
  /tenant          # Subdomain→school_id
/supabase
  /migrations
  /functions       # Edge Functions (z.B. redeem_class_code)
/public
  /assets
```


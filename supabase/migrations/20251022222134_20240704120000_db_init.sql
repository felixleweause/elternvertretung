create extension if not exists "pgcrypto";

create type public.scope_type as enum ('class', 'school');
create type public.mandate_role as enum ('class_rep', 'class_rep_deputy', 'gev', 'admin');
create type public.mandate_status as enum ('active', 'scheduled', 'ended');
create type public.poll_type as enum ('open', 'secret');
create type public.event_rsvp_status as enum ('yes', 'no', 'maybe');
create type public.task_status as enum ('pending', 'in_progress', 'done');

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique,
  school_year_end_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  year smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name, year)
);

create table public.profiles (
  id uuid primary key,
  school_id uuid not null references public.schools (id) on delete cascade,
  email text not null,
  name text not null,
  locale text not null default 'de-DE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, email)
);

alter table public.profiles
  add constraint profiles_auth_user_fk
  foreign key (id) references auth.users (id) on delete cascade;

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  child_initials text,
  created_at timestamptz not null default now(),
  unique (user_id, classroom_id)
);

create table public.mandates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  scope_type public.scope_type not null,
  scope_id uuid not null,
  role public.mandate_role not null,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  status public.mandate_status not null default 'active',
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mandates_school_idx on public.mandates (school_id);
create index mandates_user_idx on public.mandates (user_id);
create index mandates_scope_idx on public.mandates (scope_type, scope_id);

create unique index mandates_unique_active_class_rep
  on public.mandates (scope_id, role)
  where scope_type = 'class' and role in ('class_rep', 'class_rep_deputy') and status = 'active';

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  scope_type public.scope_type not null,
  scope_id uuid not null,
  title text not null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_school_idx on public.announcements (school_id);
create index announcements_scope_idx on public.announcements (scope_type, scope_id);

create table public.read_receipts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now()
);

create unique index read_receipts_unique on public.read_receipts (announcement_id, user_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  scope_type public.scope_type not null,
  scope_id uuid not null,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  agenda jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_school_idx on public.events (school_id);
create index events_scope_idx on public.events (scope_type, scope_id);
create index events_start_idx on public.events (start_at);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.event_rsvp_status not null,
  responded_at timestamptz not null default now()
);

create unique index rsvps_unique on public.rsvps (event_id, user_id);

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  scope_type public.scope_type not null,
  scope_id uuid not null,
  title text not null,
  description text,
  type public.poll_type not null,
  deadline timestamptz,
  quorum smallint,
  mandate_rule text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index polls_school_idx on public.polls (school_id);
create index polls_scope_idx on public.polls (scope_type, scope_id);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  poll_id uuid not null references public.polls (id) on delete cascade,
  voter_id uuid not null references public.mandates (id) on delete cascade,
  choice text not null,
  class_weight numeric not null default 1,
  cast_at timestamptz not null default now()
);

create unique index votes_unique on public.votes (poll_id, voter_id);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  key text not null,
  version integer not null,
  content text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create unique index templates_unique_per_version on public.templates (school_id, key, version);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  title text not null,
  assignee_id uuid references public.profiles (id),
  due_at timestamptz,
  status public.task_status not null default 'pending',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_school_idx on public.audit_log (school_id, created_at desc);

create table public.class_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  code text not null,
  expires_at timestamptz,
  uses_remaining integer,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create unique index class_codes_code_unique on public.class_codes (code);

alter table public.schools enable row level security;
alter table public.schools force row level security;

alter table public.classrooms enable row level security;
alter table public.classrooms force row level security;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

alter table public.enrollments enable row level security;
alter table public.enrollments force row level security;

alter table public.mandates enable row level security;
alter table public.mandates force row level security;

alter table public.announcements enable row level security;
alter table public.announcements force row level security;

alter table public.read_receipts enable row level security;
alter table public.read_receipts force row level security;

alter table public.events enable row level security;
alter table public.events force row level security;

alter table public.rsvps enable row level security;
alter table public.rsvps force row level security;

alter table public.polls enable row level security;
alter table public.polls force row level security;

alter table public.votes enable row level security;
alter table public.votes force row level security;

alter table public.templates enable row level security;
alter table public.templates force row level security;

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

alter table public.class_codes enable row level security;
alter table public.class_codes force row level security;
;

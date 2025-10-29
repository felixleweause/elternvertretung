-- Add minutes column for events agenda/protocol feature and allow audit logging.

alter table public.events
  add column if not exists minutes jsonb not null default '[]'::jsonb;

alter table public.events
  alter column agenda set default '[]'::jsonb;

update public.events
  set minutes = '[]'::jsonb
  where minutes is null;

drop policy if exists "audit_log_insert_school_members" on public.audit_log;
create policy "audit_log_insert_school_members"
  on public.audit_log
  for insert
  with check (
    auth.uid() is not null
    and school_id = public.get_user_school_id()
  );

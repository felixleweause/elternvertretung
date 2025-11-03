-- Election candidate codes support: poll extension, candidate table, and redemption helper.

-- 1) Extend polls with kind + seats metadata.

do $$
begin
  if not exists (
    select 1
    from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    where nsp.nspname = 'public'
      and typ.typname = 'poll_kind'
  ) then
    create type public.poll_kind as enum ('general', 'election');
  end if;
end;
$$;

alter table public.polls
  add column if not exists kind public.poll_kind not null default 'general',
  add column if not exists seats integer not null default 1;

create index if not exists polls_kind_idx on public.polls (kind);

-- 2) Candidate state enum + table for claimable codes.

do $$
begin
  if not exists (
    select 1
    from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    where nsp.nspname = 'public'
      and typ.typname = 'poll_candidate_status'
  ) then
    create type public.poll_candidate_status as enum (
      'created',
      'claimed',
      'pending_assignment',
      'assigned',
      'expired'
    );
  end if;
end;
$$;

create table if not exists public.poll_candidates (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  classroom_id uuid references public.classrooms (id) on delete set null,
  office text not null,
  display_name text not null,
  user_id uuid references public.profiles (id) on delete set null,
  claim_code text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  status public.poll_candidate_status not null default 'created',
  claimed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint poll_candidates_office_check
    check (office in ('class_rep', 'class_rep_deputy')),
  constraint poll_candidates_claim_code_format
    check (length(claim_code) between 10 and 20 and claim_code ~ '^[A-Z0-9\-]+$')
);

create index if not exists poll_candidates_poll_idx on public.poll_candidates (poll_id);
create index if not exists poll_candidates_school_idx on public.poll_candidates (school_id);
create index if not exists poll_candidates_class_idx on public.poll_candidates (classroom_id);
create index if not exists poll_candidates_status_idx on public.poll_candidates (status);
create index if not exists poll_candidates_expires_idx on public.poll_candidates (expires_at);

-- 3) Trigger to keep updated_at fresh.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'poll_candidates_touch_updated_at'
  ) then
    create trigger poll_candidates_touch_updated_at
      before update on public.poll_candidates
      for each row
      execute function public.touch_updated_at();
  end if;
end;
$$;

-- 4) RLS policies for managing candidate codes.

alter table public.poll_candidates enable row level security;

drop policy if exists "poll_candidates_service_role_all" on public.poll_candidates;
create policy "poll_candidates_service_role_all"
  on public.poll_candidates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "poll_candidates_manage_gev" on public.poll_candidates;
create policy "poll_candidates_manage_gev"
  on public.poll_candidates
  for all
  using (
    public.is_school_gev(school_id)
    or (
      classroom_id is not null
      and public.is_class_representative(classroom_id)
    )
  )
  with check (
    public.is_school_gev(school_id)
    or (
      classroom_id is not null
      and public.is_class_representative(classroom_id)
    )
  );

-- read-only access for authenticated users is intentionally omitted to keep claim codes confidential.

-- 5) Redemption helper function to set user binding & ensure enrollment.

create or replace function public.redeem_candidate_code(p_claim_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate record;
  v_user uuid := auth.uid();
  v_profile record;
  v_now timestamptz := now();
  v_enrollment_id uuid;
  v_already boolean := false;
begin
  if v_user is null then
    raise exception 'not_authenticated'
      using errcode = '28000',
            message = 'not_authenticated Du bist nicht angemeldet.';
  end if;

  if p_claim_code is null or length(trim(p_claim_code)) = 0 then
    raise exception 'invalid_code'
      using errcode = '22023',
            message = 'invalid_code Bitte gib einen gültigen Code ein.';
  end if;

  select
    c.*,
    p.school_id as poll_school_id,
    p.scope_type,
    p.scope_id,
    p.id as target_poll_id
  into v_candidate
  from public.poll_candidates c
  join public.polls p on p.id = c.poll_id
  where c.claim_code = upper(trim(p_claim_code));

  if not found then
    raise exception 'code_not_found'
      using errcode = 'P0002',
            message = 'code_not_found Code wurde nicht gefunden.';
  end if;

  if v_candidate.status = 'expired' or v_candidate.expires_at < v_now then
    update public.poll_candidates
      set status = 'expired',
          updated_at = v_now
      where id = v_candidate.id;

    raise exception 'code_expired'
      using errcode = 'P0004',
            message = 'code_expired Dieser Code ist abgelaufen.';
  end if;

  select id, school_id
  into v_profile
  from public.profiles
  where id = v_user;

  if v_profile.school_id is null then
    raise exception 'profile_missing'
      using errcode = 'P0003',
            message = 'profile_missing Dem Account fehlt eine Schule.';
  end if;

  if v_profile.school_id <> v_candidate.poll_school_id then
    raise exception 'code_wrong_school'
      using errcode = '42501',
            message = 'code_wrong_school Dieser Code gehört zu einer anderen Schule.';
  end if;

  if v_candidate.status = 'claimed' and v_candidate.user_id = v_user then
    v_already := true;
  elsif v_candidate.status = 'claimed' and v_candidate.user_id is distinct from v_user then
    raise exception 'code_used'
      using errcode = 'P0005',
            message = 'code_used Dieser Code wurde bereits verwendet.';
  end if;

  if v_candidate.scope_type = 'class' and v_candidate.scope_id is not null then
    select id
    into v_enrollment_id
    from public.enrollments
    where classroom_id = v_candidate.scope_id
      and user_id = v_user;

    if v_enrollment_id is null then
      insert into public.enrollments (school_id, user_id, classroom_id)
      values (v_profile.school_id, v_user, v_candidate.scope_id)
      returning id into v_enrollment_id;
    end if;
  end if;

  if not v_already then
    update public.poll_candidates
      set
        user_id = v_user,
        claimed_at = v_now,
        status = 'claimed',
        updated_at = v_now
      where id = v_candidate.id;

    insert into public.audit_log (action, actor_id, entity, entity_id, school_id, meta)
    values (
      'CANDIDATE_CLAIM',
      v_user,
      'poll_candidate',
      v_candidate.id,
      v_candidate.poll_school_id,
      jsonb_build_object(
        'poll_id', v_candidate.target_poll_id,
        'office', v_candidate.office,
        'display_name', v_candidate.display_name
      )
    );
  end if;

  return jsonb_build_object(
    'candidate_id', v_candidate.id,
    'poll_id', v_candidate.target_poll_id,
    'office', v_candidate.office,
    'already_claimed', v_already
  );
end;
$$;

grant execute on function public.redeem_candidate_code(text) to authenticated, anon, service_role;

-- 6) Extend poll access & management helpers for GEV on class polls.

create or replace function public.can_access_poll(p_poll_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_poll record;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return false;
  end if;

  select id, school_id, scope_type, scope_id
  into v_poll
  from public.polls
  where id = p_poll_id;

  if not found then
    return false;
  end if;

  if public.is_school_admin(v_poll.school_id)
     or public.is_school_gev(v_poll.school_id)
  then
    return true;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user
      and p.school_id = v_poll.school_id
  ) then
    return false;
  end if;

  if v_poll.scope_type = 'school' then
    return true;
  end if;

  if v_poll.scope_type = 'class' then
    return public.is_class_member(v_poll.scope_id)
      or public.is_class_representative(v_poll.scope_id)
      or public.is_school_gev(v_poll.school_id);
  end if;

  return false;
end;
$$;

create or replace function public.can_manage_poll(p_poll_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_poll record;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return false;
  end if;

  select school_id, scope_type, scope_id, created_by
  into v_poll
  from public.polls
  where id = p_poll_id;

  if not found then
    return false;
  end if;

  if v_poll.created_by = v_user then
    return true;
  end if;

  if public.is_school_admin(v_poll.school_id) then
    return true;
  end if;

  if v_poll.scope_type = 'school'
     and public.is_school_gev(v_poll.school_id)
  then
    return true;
  end if;

  if v_poll.scope_type = 'class' then
    if public.is_class_representative(v_poll.scope_id) then
      return true;
    end if;

    if public.is_school_gev(v_poll.school_id) then
      return true;
    end if;
  end if;

  return false;
end;
$$;

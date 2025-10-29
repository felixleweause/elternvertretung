-- Enable polls & votes feature with RLS policies, helper functions and constraints.

create type public.poll_status as enum ('draft', 'open', 'closed');

alter table public.polls
  add column if not exists status public.poll_status not null default 'open',
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists allow_abstain boolean not null default false,
  add column if not exists closed_at timestamptz;

create index if not exists polls_deadline_idx on public.polls (deadline);
create index if not exists polls_status_idx on public.polls (status);

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
      or public.is_class_representative(v_poll.scope_id);
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

  if v_poll.scope_type = 'class'
     and public.is_class_representative(v_poll.scope_id)
  then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.poll_vote_allowed(p_poll_id uuid, p_voter_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_poll record;
  v_mandate record;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    return false;
  end if;

  select id, school_id, scope_type, scope_id, status, deadline
  into v_poll
  from public.polls
  where id = p_poll_id;

  if not found then
    return false;
  end if;

  if v_poll.status <> 'open' then
    return false;
  end if;

  if v_poll.deadline is not null and v_poll.deadline < v_now then
    return false;
  end if;

  select id, school_id, scope_type, scope_id, role, status, user_id, start_at, end_at
  into v_mandate
  from public.mandates
  where id = p_voter_id;

  if not found then
    return false;
  end if;

  if v_mandate.user_id <> auth.uid() then
    return false;
  end if;

  if v_mandate.school_id <> v_poll.school_id then
    return false;
  end if;

  if v_mandate.status <> 'active' then
    return false;
  end if;

  if v_mandate.start_at > v_now then
    return false;
  end if;

  if v_mandate.end_at is not null and v_mandate.end_at < v_now then
    return false;
  end if;

  if v_poll.scope_type = 'class' then
    if v_mandate.scope_type <> 'class'
       or v_mandate.scope_id <> v_poll.scope_id
       or v_mandate.role not in ('class_rep', 'class_rep_deputy')
    then
      return false;
    end if;
  elsif v_poll.scope_type = 'school' then
    if v_mandate.scope_type <> 'school'
       or v_mandate.scope_id <> v_poll.school_id
       or v_mandate.role not in ('gev', 'admin')
    then
      return false;
    end if;
  else
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.poll_vote_summary(p_poll_id uuid)
returns table (choice text, votes bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_poll record;
  v_now timestamptz := now();
begin
  select id, type, status, deadline
  into v_poll
  from public.polls
  where id = p_poll_id;

  if not found then
    return;
  end if;

  if v_poll.type = 'secret'
     and v_poll.status = 'open'
     and (v_poll.deadline is null or v_poll.deadline > v_now)
     and not public.can_manage_poll(p_poll_id)
  then
    return;
  end if;

  return query
  select choice, count(*)::bigint
  from public.votes
  where poll_id = p_poll_id
  group by choice
  order by choice;
end;
$$;

create or replace function public.set_vote_school_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid;
begin
  select school_id
  into v_school
  from public.polls
  where id = new.poll_id;

  if v_school is null then
    raise exception using message = 'poll_not_found';
  end if;

  new.school_id := v_school;
  return new;
end;
$$;

drop trigger if exists set_vote_school on public.votes;
create trigger set_vote_school
  before insert or update on public.votes
  for each row
  execute function public.set_vote_school_id();

grant execute on function public.can_access_poll(uuid) to authenticated;
grant execute on function public.can_manage_poll(uuid) to authenticated;
grant execute on function public.poll_vote_allowed(uuid, uuid) to authenticated;
grant execute on function public.poll_vote_summary(uuid) to authenticated;

drop policy if exists "polls_service_role_all" on public.polls;
create policy "polls_service_role_all"
  on public.polls
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "polls_select_members" on public.polls;
create policy "polls_select_members"
  on public.polls
  for select
  using (public.can_access_poll(id));

drop policy if exists "polls_insert_roles" on public.polls;
create policy "polls_insert_roles"
  on public.polls
  for insert
  with check (
    school_id = public.get_user_school_id()
    and created_by = auth.uid()
    and (
      (scope_type = 'class' and public.is_class_representative(scope_id))
      or (
        scope_type = 'school'
        and (
          public.is_school_admin(school_id)
          or public.is_school_gev(school_id)
        )
      )
    )
  );

drop policy if exists "polls_update_manager" on public.polls;
create policy "polls_update_manager"
  on public.polls
  for update
  using (public.can_manage_poll(id))
  with check (public.can_manage_poll(id));

drop policy if exists "polls_delete_manager" on public.polls;
create policy "polls_delete_manager"
  on public.polls
  for delete
  using (public.can_manage_poll(id));

drop policy if exists "votes_service_role_all" on public.votes;
create policy "votes_service_role_all"
  on public.votes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "votes_select_self_or_manager" on public.votes;
create policy "votes_select_self_or_manager"
  on public.votes
  for select
  using (
    public.can_manage_poll(poll_id)
    or exists (
      select 1
      from public.mandates m
      where m.id = voter_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "votes_insert_allowed" on public.votes;
create policy "votes_insert_allowed"
  on public.votes
  for insert
  with check (public.poll_vote_allowed(poll_id, voter_id));

drop policy if exists "votes_update_allowed" on public.votes;
create policy "votes_update_allowed"
  on public.votes
  for update
  using (public.poll_vote_allowed(poll_id, voter_id))
  with check (public.poll_vote_allowed(poll_id, voter_id));

drop policy if exists "votes_delete_manager" on public.votes;
create policy "votes_delete_manager"
  on public.votes
  for delete
  using (public.can_manage_poll(poll_id));

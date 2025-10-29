alter table public.events
  alter column school_id set default public.get_user_school_id(),
  alter column created_by set default auth.uid();

create or replace function public.can_access_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_event record;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return false;
  end if;

  select school_id, scope_type, scope_id
  into v_event
  from public.events
  where id = p_event_id;

  if not found then
    return false;
  end if;

  if public.is_school_admin(v_event.school_id)
     or public.is_school_gev(v_event.school_id)
  then
    return true;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user
      and p.school_id = v_event.school_id
  ) then
    return false;
  end if;

  if v_event.scope_type = 'school' then
    return true;
  end if;

  if v_event.scope_type = 'class' then
    if public.is_class_member(v_event.scope_id)
       or public.is_class_representative(v_event.scope_id)
    then
      return true;
    end if;
  end if;

  return false;
end;
$$;

create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_event record;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return false;
  end if;

  select school_id, scope_type, scope_id, created_by
  into v_event
  from public.events
  where id = p_event_id;

  if not found then
    return false;
  end if;

  if v_event.created_by = v_user then
    return true;
  end if;

  if public.is_school_admin(v_event.school_id) then
    return true;
  end if;

  if v_event.scope_type = 'school'
     and public.is_school_gev(v_event.school_id)
  then
    return true;
  end if;

  if v_event.scope_type = 'class'
     and public.is_class_representative(v_event.scope_id)
  then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.can_access_event(uuid) to authenticated;
grant execute on function public.can_manage_event(uuid) to authenticated;

drop policy if exists "events_select_members" on public.events;
create policy "events_select_members"
  on public.events
  for select
  using (
    auth.uid() is not null
    and (
      public.is_school_admin(school_id)
      or public.is_school_gev(school_id)
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.school_id = events.school_id
      )
    )
    and (
      scope_type <> 'class'
      or public.is_class_member(scope_id)
      or public.is_class_representative(scope_id)
      or public.is_school_admin(school_id)
      or public.is_school_gev(school_id)
    )
  );

drop policy if exists "events_insert_class_reps" on public.events;
create policy "events_insert_class_reps"
  on public.events
  for insert
  with check (
    scope_type = 'class'
    and public.is_class_representative(scope_id)
    and school_id = public.get_user_school_id()
  );

drop policy if exists "events_insert_school_roles" on public.events;
create policy "events_insert_school_roles"
  on public.events
  for insert
  with check (
    scope_type = 'school'
    and (
      public.is_school_admin(school_id)
      or public.is_school_gev(school_id)
    )
    and school_id = public.get_user_school_id()
  );

drop policy if exists "events_update_manager" on public.events;
create policy "events_update_manager"
  on public.events
  for update
  using (public.can_manage_event(id))
  with check (public.can_manage_event(id));

drop policy if exists "events_delete_manager" on public.events;
create policy "events_delete_manager"
  on public.events
  for delete
  using (public.can_manage_event(id));

create or replace function public.set_rsvp_school_id()
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
  from public.events
  where id = new.event_id;

  if v_school is null then
    raise exception using message = 'event_not_found';
  end if;

  new.school_id := v_school;
  return new;
end;
$$;

drop trigger if exists set_rsvp_school on public.rsvps;
create trigger set_rsvp_school
  before insert or update on public.rsvps
  for each row
  execute function public.set_rsvp_school_id();

drop policy if exists "rsvps_select_self_or_manager" on public.rsvps;
create policy "rsvps_select_self_or_manager"
  on public.rsvps
  for select
  using (
    auth.uid() = user_id
    or public.can_manage_event(event_id)
  );

drop policy if exists "rsvps_insert_self" on public.rsvps;
create policy "rsvps_insert_self"
  on public.rsvps
  for insert
  with check (
    auth.uid() = user_id
    and public.can_access_event(event_id)
  );

drop policy if exists "rsvps_update_self" on public.rsvps;
create policy "rsvps_update_self"
  on public.rsvps
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.can_access_event(event_id)
  );

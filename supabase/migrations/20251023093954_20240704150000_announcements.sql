-- Extend announcements and read_receipts with policies and helper functions.

create or replace function public.get_user_school_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select school_id
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_class_member(p_classroom_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.user_id = auth.uid()
      and e.classroom_id = p_classroom_id
  );
$$;

create or replace function public.is_class_representative(p_classroom_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.mandates m
    where m.user_id = auth.uid()
      and m.scope_type = 'class'
      and m.scope_id = p_classroom_id
      and m.role in ('class_rep', 'class_rep_deputy')
      and m.status = 'active'
      and m.start_at <= now()
      and (m.end_at is null or m.end_at >= now())
  );
$$;

alter table public.announcements
  add column if not exists allow_comments boolean not null default false,
  add column if not exists requires_ack boolean not null default false,
  add column if not exists pinned boolean not null default false;

create index if not exists announcements_created_at_idx on public.announcements (created_at desc);
create index if not exists announcements_scope_idx on public.announcements (scope_type, scope_id);
create index if not exists announcements_pinned_idx on public.announcements (pinned desc, created_at desc);

drop policy if exists "announcements_select_school_members" on public.announcements;
create policy "announcements_select_school_members"
  on public.announcements
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
          and p.school_id = announcements.school_id
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

drop policy if exists "announcements_insert_class_rep" on public.announcements;
create policy "announcements_insert_class_rep"
  on public.announcements
  for insert
  with check (
    scope_type = 'class'
    and public.is_class_representative(scope_id)
    and school_id = public.get_user_school_id()
  );

drop policy if exists "announcements_insert_school_roles" on public.announcements;
create policy "announcements_insert_school_roles"
  on public.announcements
  for insert
  with check (
    scope_type = 'school'
    and (
      public.is_school_admin(school_id)
      or public.is_school_gev(school_id)
    )
  );

drop policy if exists "announcements_update_owner_or_roles" on public.announcements;
create policy "announcements_update_owner_or_roles"
  on public.announcements
  for update
  using (
    auth.uid() = created_by
    or public.is_school_admin(school_id)
    or (
      scope_type = 'class'
      and public.is_class_representative(scope_id)
    )
    or (
      scope_type = 'school'
      and public.is_school_gev(school_id)
    )
  )
  with check (
    auth.uid() = created_by
    or public.is_school_admin(school_id)
    or (
      scope_type = 'class'
      and public.is_class_representative(scope_id)
    )
    or (
      scope_type = 'school'
      and public.is_school_gev(school_id)
    )
  );

drop policy if exists "announcements_delete_owner_or_admin" on public.announcements;
create policy "announcements_delete_owner_or_admin"
  on public.announcements
  for delete
  using (
    auth.uid() = created_by
    or public.is_school_admin(school_id)
  );

drop policy if exists "read_receipts_select_self" on public.read_receipts;
create policy "read_receipts_select_self"
  on public.read_receipts
  for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "read_receipts_insert_self" on public.read_receipts;
create policy "read_receipts_insert_self"
  on public.read_receipts
  for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "read_receipts_update_self" on public.read_receipts;
create policy "read_receipts_update_self"
  on public.read_receipts
  for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

create or replace function public.mark_announcement_read(p_announcement_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_school uuid;
  v_scope_type public.scope_type;
  v_scope_id uuid;
  v_read_at timestamptz;
begin
  if v_user is null then
    raise exception using message = 'not_authenticated';
  end if;

  select school_id, scope_type, scope_id
  into v_school, v_scope_type, v_scope_id
  from public.announcements
  where id = p_announcement_id;

  if not found then
    raise exception using message = 'announcement_not_found';
  end if;

  if not (
    public.is_school_admin(v_school)
    or public.is_school_gev(v_school)
    or exists (
      select 1 from public.profiles p
      where p.id = v_user and p.school_id = v_school
    )
  ) then
    raise exception using message = 'forbidden';
  end if;

  if v_scope_type = 'class' and not (
    public.is_class_member(v_scope_id)
    or public.is_class_representative(v_scope_id)
    or public.is_school_admin(v_school)
    or public.is_school_gev(v_school)
  ) then
    raise exception using message = 'forbidden';
  end if;

  insert into public.read_receipts (announcement_id, user_id, school_id, read_at)
  values (p_announcement_id, v_user, v_school, now())
  on conflict (announcement_id, user_id)
  do update set read_at = excluded.read_at
  returning read_at into v_read_at;

  return v_read_at;
end;
$$;

grant execute on function public.mark_announcement_read(uuid) to authenticated;;

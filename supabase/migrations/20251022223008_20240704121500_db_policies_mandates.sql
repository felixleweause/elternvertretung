-- RLS policies and helper functions for mandates management.

create or replace function public.is_school_admin(target_school uuid)
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
      and m.school_id = target_school
      and m.role = 'admin'
      and m.status = 'active'
      and m.start_at <= now()
      and (m.end_at is null or m.end_at >= now())
  );
$$;

create or replace function public.is_school_gev(target_school uuid)
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
      and m.school_id = target_school
      and m.role = 'gev'
      and m.scope_type = 'school'
      and m.scope_id = target_school
      and m.status = 'active'
      and m.start_at <= now()
      and (m.end_at is null or m.end_at >= now())
  );
$$;

create or replace function public.class_belongs_to_school(class_id uuid, target_school uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.classrooms c
    where c.id = class_id
      and c.school_id = target_school
  );
$$;

drop policy if exists "mandates_service_role_all" on public.mandates;
create policy "mandates_service_role_all"
  on public.mandates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "mandates_select_own" on public.mandates;
create policy "mandates_select_own"
  on public.mandates
  for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "mandates_select_admin" on public.mandates;
create policy "mandates_select_admin"
  on public.mandates
  for select
  using (public.is_school_admin(school_id));

drop policy if exists "mandates_select_gev_class" on public.mandates;
create policy "mandates_select_gev_class"
  on public.mandates
  for select
  using (
    public.is_school_gev(school_id)
    and scope_type = 'class'
    and role in ('class_rep', 'class_rep_deputy')
  );

drop policy if exists "mandates_insert_admin" on public.mandates;
create policy "mandates_insert_admin"
  on public.mandates
  for insert
  with check (public.is_school_admin(school_id));

drop policy if exists "mandates_insert_gev_class" on public.mandates;
create policy "mandates_insert_gev_class"
  on public.mandates
  for insert
  with check (
    public.is_school_gev(school_id)
    and scope_type = 'class'
    and role in ('class_rep', 'class_rep_deputy')
    and public.class_belongs_to_school(scope_id, school_id)
  );

drop policy if exists "mandates_update_admin" on public.mandates;
create policy "mandates_update_admin"
  on public.mandates
  for update
  using (public.is_school_admin(school_id))
  with check (public.is_school_admin(school_id));

drop policy if exists "mandates_update_gev_class" on public.mandates;
create policy "mandates_update_gev_class"
  on public.mandates
  for update
  using (
    public.is_school_gev(school_id)
    and scope_type = 'class'
    and role in ('class_rep', 'class_rep_deputy')
  )
  with check (
    public.is_school_gev(school_id)
    and scope_type = 'class'
    and role in ('class_rep', 'class_rep_deputy')
    and public.class_belongs_to_school(scope_id, school_id)
  );

drop policy if exists "mandates_delete_admin" on public.mandates;
create policy "mandates_delete_admin"
  on public.mandates
  for delete
  using (public.is_school_admin(school_id));

drop policy if exists "mandates_delete_gev_class" on public.mandates;
create policy "mandates_delete_gev_class"
  on public.mandates
  for delete
  using (
    public.is_school_gev(school_id)
    and scope_type = 'class'
    and role in ('class_rep', 'class_rep_deputy')
    and public.class_belongs_to_school(scope_id, school_id)
  );
;

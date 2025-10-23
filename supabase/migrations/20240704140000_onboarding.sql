create or replace function public.enroll_with_class_code(p_code text, p_child_initials text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.class_codes%rowtype;
  v_enrollment public.enrollments%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using message = 'not_authenticated';
  end if;

  select *
  into v_class
  from public.class_codes
  where code = p_code
    and (expires_at is null or expires_at > now())
  for update;

  if not found then
    raise exception using message = 'invalid_or_expired_code';
  end if;

  if v_class.uses_remaining is not null and v_class.uses_remaining < 1 then
    raise exception using message = 'code_no_longer_valid';
  end if;

  select *
  into v_enrollment
  from public.enrollments
  where user_id = v_user_id
    and classroom_id = v_class.classroom_id
  limit 1;

  if found then
    if p_child_initials is not null and coalesce(v_enrollment.child_initials, '') <> p_child_initials then
      update public.enrollments
      set child_initials = p_child_initials,
          updated_at = now()
      where id = v_enrollment.id
      returning * into v_enrollment;
    end if;
  else
    insert into public.enrollments (school_id, user_id, classroom_id, child_initials)
    values (v_class.school_id, v_user_id, v_class.classroom_id, p_child_initials)
    returning * into v_enrollment;

    if v_class.uses_remaining is not null then
      update public.class_codes
      set uses_remaining = uses_remaining - 1
      where id = v_class.id;
    end if;
  end if;

  return jsonb_build_object(
    'enrollment_id', v_enrollment.id,
    'classroom_id', v_enrollment.classroom_id,
    'school_id', v_enrollment.school_id,
    'child_initials', v_enrollment.child_initials
  );
end;
$$;

grant execute on function public.enroll_with_class_code(text, text) to authenticated;

drop policy if exists "enrollments_select_self" on public.enrollments;
create policy "enrollments_select_self"
  on public.enrollments
  for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "classrooms_select_by_members" on public.classrooms;
create policy "classrooms_select_by_members"
  on public.classrooms
  for select
  using (
    auth.uid() is not null
    and (
      public.is_school_admin(school_id)
      or public.is_school_gev(school_id)
      or exists (
        select 1
        from public.enrollments e
        where e.classroom_id = classrooms.id
          and e.user_id = auth.uid()
      )
    )
  );

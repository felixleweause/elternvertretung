drop policy if exists "profiles_select_self_and_school" on public.profiles;
create policy "profiles_select_self_and_school"
  on public.profiles
  for select
  using (
    auth.uid() is not null
    and (
      id = auth.uid()
      or school_id = public.get_user_school_id()
    )
  );

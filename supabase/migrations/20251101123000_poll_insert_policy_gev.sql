-- Extend poll insert policy so that GEV-Mitglieder Klassenwahlen anlegen dürfen.

drop policy if exists "polls_insert_roles" on public.polls;
create policy "polls_insert_roles"
  on public.polls
  for insert
  with check (
    school_id = public.get_user_school_id()
    and created_by = auth.uid()
    and (
      (
        scope_type = 'class'
        and (
          public.is_class_representative(scope_id)
          or public.is_school_gev(school_id)
        )
      )
      or (
        scope_type = 'school'
        and (
          public.is_school_admin(school_id)
          or public.is_school_gev(school_id)
        )
      )
    )
  );

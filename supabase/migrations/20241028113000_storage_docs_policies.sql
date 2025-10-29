-- Harden access to the `docs` storage bucket by enforcing restrictive policies.

insert into storage.buckets (id, name, public)
values ('docs', 'docs', false)
on conflict (id) do update
set public = excluded.public;

create or replace function public.storage_docs_event_id(object_name text)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_parts text[];
  v_candidate uuid;
begin
  if object_name is null or object_name = '' then
    return null;
  end if;

  v_parts := string_to_array(object_name, '/');
  if array_length(v_parts, 1) < 2 then
    return null;
  end if;

  if v_parts[1] <> 'events' then
    return null;
  end if;

  begin
    v_candidate := v_parts[2]::uuid;
  exception when others then
    return null;
  end;

  return v_candidate;
end;
$$;

grant execute on function public.storage_docs_event_id(text) to authenticated;

drop policy if exists "Docs service role full access" on storage.objects;
create policy "Docs service role full access"
  on storage.objects
  for all
  using (
    bucket_id = 'docs'
    and auth.role() = 'service_role'
  )
  with check (
    bucket_id = 'docs'
    and auth.role() = 'service_role'
  );

drop policy if exists "Docs insert event managers" on storage.objects;
create policy "Docs insert event managers"
  on storage.objects
  for insert
  with check (
    bucket_id = 'docs'
    and public.storage_docs_event_id(name) is not null
    and public.can_manage_event(public.storage_docs_event_id(name))
  );

drop policy if exists "Docs update event managers" on storage.objects;
create policy "Docs update event managers"
  on storage.objects
  for update
  using (
    bucket_id = 'docs'
    and public.storage_docs_event_id(name) is not null
    and public.can_manage_event(public.storage_docs_event_id(name))
  )
  with check (
    bucket_id = 'docs'
    and public.storage_docs_event_id(name) is not null
    and public.can_manage_event(public.storage_docs_event_id(name))
  );

drop policy if exists "Docs delete event managers" on storage.objects;
create policy "Docs delete event managers"
  on storage.objects
  for delete
  using (
    bucket_id = 'docs'
    and public.storage_docs_event_id(name) is not null
    and public.can_manage_event(public.storage_docs_event_id(name))
  );

drop policy if exists "Docs select event members" on storage.objects;
create policy "Docs select event members"
  on storage.objects
  for select
  using (
    bucket_id = 'docs'
    and public.storage_docs_event_id(name) is not null
    and public.can_access_event(public.storage_docs_event_id(name))
  );

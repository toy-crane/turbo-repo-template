ALTER TABLE public.profiles ADD COLUMN account_deletion_started_at timestamp with time zone;
COMMENT ON COLUMN public.profiles.account_deletion_started_at IS 'Write fence set before account deletion removes avatar objects. Clients cannot change it.';

-- Storage objects are not part of the declarative public-schema diff. Replace
-- the two write policies here so a stale JWT cannot create an avatar after its
-- account starts deletion. FOR SHARE makes the profile update that raises the
-- fence wait for avatar writes that already passed this check.
drop policy avatars_insert_own on storage.objects;

create policy avatars_insert_own on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and storage.foldername(name) = array[(select auth.uid())::text]
    and exists (
      select 1
      from public.profiles
      where public.profiles.id = (select auth.uid())
        and public.profiles.account_deletion_started_at is null
      for share
    )
  );

drop policy avatars_update_own on storage.objects;

create policy avatars_update_own on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and storage.foldername(name) = array[(select auth.uid())::text]
    and exists (
      select 1
      from public.profiles
      where public.profiles.id = (select auth.uid())
        and public.profiles.account_deletion_started_at is null
      for share
    )
  )
  with check (
    bucket_id = 'avatars'
    and storage.foldername(name) = array[(select auth.uid())::text]
    and exists (
      select 1
      from public.profiles
      where public.profiles.id = (select auth.uid())
        and public.profiles.account_deletion_started_at is null
      for share
    )
  );

-- The bucket profile pictures live in.
--
-- Hand-written rather than generated. `supabase/schemas/` describes the `public`
-- schema, and the declarative diff only reports on the schemas it is given, so the
-- bucket row and the policies on `storage.objects` would never appear in a diff.
--
-- Public on read: a profile picture is shown to every signed-in person who sees
-- that profile, and serving it through the public route means the image loads as an
-- ordinary URL rather than needing a signed one refreshed on every render. Nothing
-- private is in the bucket; the write policies below are what keep it that way.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  -- A profile picture arrives resized from the picker, so this is a ceiling on
  -- mistakes rather than a working limit.
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Every policy below matches on the first path segment being the caller's own user
-- id, which is the same shape `profiles_avatar_path_owned` requires of the stored
-- path. One person's folder is the unit of ownership, so a second upload cannot
-- land in somebody else's folder and a delete cannot reach one.
--
-- `(select auth.uid())` rather than a bare call: evaluated once per statement
-- instead of once per row.
create policy avatars_insert_own on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- `using` decides which existing objects may be replaced and `with check` what they
-- may become. Both name the same folder, so an overwrite cannot move a file out of
-- its owner's folder or into another's.
create policy avatars_update_own on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_delete_own on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Showing a picture needs no policy at all: a public bucket serves
-- `/object/public/...` without consulting RLS, which is how every profile picture
-- in the app loads.
--
-- So this covers only the one thing a client does through the authenticated API —
-- listing its own folder to clear the previous file after a replacement. Scoped to
-- the owner's folder for the same reason `profiles_select_own` exists: a policy
-- covering the whole bucket would let any signed-in client list every folder, and
-- a folder name here is a user's id.
create policy avatars_select_own on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

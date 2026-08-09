-- Signup path: a failing trigger on auth.users fails the whole signup, so these
-- tests cover the ways this one could fail rather than only its happy path.
--
-- GoTrue writes new users as supabase_auth_admin. This connection cannot become
-- that role, so the properties that make the trigger work for it are asserted
-- from the catalog here, and the live path is covered by the local integration
-- test that signs up through real GoTrue.
BEGIN;
SELECT plan(15);

SELECT is_definer(
  'public', 'handle_new_user', ARRAY[]::name[],
  'handle_new_user runs as its owner, not as the signing-up caller'
);

SELECT is(
  (SELECT proconfig FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure),
  ARRAY['search_path=""'],
  'handle_new_user pins an empty search_path'
);

-- A `security definer` function is only useful here if its owner may write the
-- table. Owner mismatch is the quiet way this breaks.
SELECT is(
  (SELECT proowner::regrole::text FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure),
  (SELECT tableowner::text FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'),
  'handle_new_user is owned by the owner of public.profiles'
);

-- set_updated_at only rewrites a column of the row the caller is already
-- updating, so it must not carry the owner's privileges.
SELECT isnt_definer(
  'public', 'set_updated_at', ARRAY[]::name[],
  'set_updated_at runs as the caller'
);

-- The pin above is only half the protection: with an empty search_path in
-- force, any unqualified name left in the function body fails to resolve and
-- takes the whole signup down with it. This insert is what proves the body
-- names every object in full.
SELECT lives_ok(
  $$insert into auth.users (id, email)
    values ('11111111-1111-4111-8111-111111111111', 'trigger-a@example.test')$$,
  'signup succeeds with the empty search_path in force'
);

SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '11111111-1111-4111-8111-111111111111'),
  1::bigint,
  'a new auth user gets exactly one profile'
);

SELECT is(
  (SELECT display_name FROM public.profiles WHERE id = '11111111-1111-4111-8111-111111111111'),
  NULL::text,
  'the trigger leaves display_name empty'
);

SELECT is(
  (SELECT avatar_url FROM public.profiles WHERE id = '11111111-1111-4111-8111-111111111111'),
  NULL::text,
  'the trigger leaves avatar_url empty'
);

-- The trigger is the only intended caller. A Data API role able to call it
-- directly could create profile rows for user ids of its choosing.
SELECT function_privs_are(
  'public', 'handle_new_user', ARRAY[]::name[], 'anon', ARRAY[]::text[],
  'anon cannot execute handle_new_user'
);

SELECT function_privs_are(
  'public', 'handle_new_user', ARRAY[]::name[], 'authenticated', ARRAY[]::text[],
  'authenticated cannot execute handle_new_user'
);

DELETE FROM auth.users WHERE id = '11111111-1111-4111-8111-111111111111';

SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '11111111-1111-4111-8111-111111111111'),
  0::bigint,
  'deleting the user deletes the profile'
);

-- updated_at belongs to the database, not to whoever sends the update.
INSERT INTO auth.users (id, email)
VALUES ('22222222-2222-4222-8222-222222222222', 'trigger-b@example.test');

-- Backdate through a disabled trigger so the next two updates have something
-- other than now() to move away from. Both statements are inside the
-- transaction this file rolls back.
ALTER TABLE public.profiles DISABLE TRIGGER profiles_set_updated_at;
UPDATE public.profiles
SET updated_at = '2000-01-01T00:00:00Z'
WHERE id = '22222222-2222-4222-8222-222222222222';
ALTER TABLE public.profiles ENABLE TRIGGER profiles_set_updated_at;

UPDATE public.profiles
SET display_name = display_name
WHERE id = '22222222-2222-4222-8222-222222222222';

SELECT is(
  (SELECT updated_at FROM public.profiles WHERE id = '22222222-2222-4222-8222-222222222222'),
  '2000-01-01T00:00:00Z'::timestamptz,
  'an update that changes nothing leaves updated_at alone'
);

UPDATE public.profiles
SET display_name = 'Chosen name'
WHERE id = '22222222-2222-4222-8222-222222222222';

SELECT is(
  (SELECT updated_at FROM public.profiles WHERE id = '22222222-2222-4222-8222-222222222222'),
  now(),
  'a real change stamps updated_at'
);

-- The backfill in the create_profiles migration relies on this: re-running the
-- insert must not raise, and must not overwrite what the user already saved.
SELECT lives_ok(
  $$insert into public.profiles (id)
    select id from auth.users
    on conflict (id) do nothing$$,
  'backfilling profiles for existing users raises nothing'
);

SELECT is(
  (SELECT display_name FROM public.profiles WHERE id = '22222222-2222-4222-8222-222222222222'),
  'Chosen name',
  'the backfill leaves an existing profile untouched'
);

SELECT * FROM finish();
ROLLBACK;

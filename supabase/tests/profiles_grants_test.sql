-- Declared access surface of public.profiles. These read the catalog rather than
-- the behaviour, so a grant that widens by accident fails here even when no
-- query happens to notice it.
BEGIN;
SELECT plan(23);

SELECT has_table('public', 'profiles', 'public.profiles exists');

SELECT col_is_pk('public', 'profiles', 'id', 'id is the primary key');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass),
  'row level security is enabled'
);

SELECT policies_are(
  'public', 'profiles',
  ARRAY['profiles_select_own', 'profiles_update_own'],
  'profiles carries exactly the select and update policies'
);

-- Both halves are required. With USING alone a user could hand their own row to
-- another user id; with WITH CHECK alone they could reach rows they do not own.
SELECT isnt(
  (SELECT qual FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own'),
  NULL,
  'the update policy has a USING expression'
);

SELECT isnt(
  (SELECT with_check FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own'),
  NULL,
  'the update policy has a WITH CHECK expression'
);

-- RLS does not restrain TRUNCATE, so an unrevoked default privilege here would
-- not show up as a policy problem.
SELECT table_privs_are(
  'public', 'profiles', 'anon', ARRAY[]::text[],
  'anon holds no privilege on profiles'
);

SELECT table_privs_are(
  'public', 'profiles', 'authenticated', ARRAY['SELECT'],
  'authenticated holds no table-wide privilege beyond SELECT'
);

-- Only these three columns are the user's to change. id and created_at are
-- identity and history; updated_at is set by the trigger.
SELECT column_privs_are(
  'public', 'profiles', 'display_name', 'authenticated', ARRAY['SELECT', 'UPDATE'],
  'authenticated can read and write display_name'
);

SELECT column_privs_are(
  'public', 'profiles', 'username', 'authenticated', ARRAY['SELECT', 'UPDATE'],
  'authenticated can read and write username'
);

SELECT column_privs_are(
  'public', 'profiles', 'avatar_url', 'authenticated', ARRAY['SELECT', 'UPDATE'],
  'authenticated can read and write avatar_url'
);

SELECT column_privs_are(
  'public', 'profiles', 'id', 'authenticated', ARRAY['SELECT'],
  'authenticated cannot write id'
);

SELECT column_privs_are(
  'public', 'profiles', 'created_at', 'authenticated', ARRAY['SELECT'],
  'authenticated cannot write created_at'
);

SELECT column_privs_are(
  'public', 'profiles', 'updated_at', 'authenticated', ARRAY['SELECT'],
  'authenticated cannot write updated_at'
);

SELECT column_privs_are(
  'public', 'profiles', 'account_deletion_started_at', 'authenticated', ARRAY['SELECT'],
  'authenticated cannot lower the account deletion write fence'
);

SELECT function_privs_are(
  'public', 'set_updated_at', ARRAY[]::name[], 'anon', ARRAY[]::text[],
  'anon cannot execute set_updated_at'
);

SELECT function_privs_are(
  'public', 'set_updated_at', ARRAY[]::name[], 'authenticated', ARRAY[]::text[],
  'authenticated cannot execute set_updated_at'
);

-- The two availability functions are SECURITY DEFINER and read every profile
-- row, so who may call them is the whole of their access control. anon holds the
-- publishable key that ships inside the app bundle and must not be able to probe
-- which account ids exist.
SELECT function_privs_are(
  'public', 'username_status', ARRAY['text']::name[], 'anon', ARRAY[]::text[],
  'anon cannot execute username_status'
);

SELECT function_privs_are(
  'public', 'username_status', ARRAY['text']::name[], 'authenticated', ARRAY['EXECUTE'],
  'a signed-in user can execute username_status'
);

SELECT function_privs_are(
  'public', 'available_usernames', ARRAY['text[]']::name[], 'anon', ARRAY[]::text[],
  'anon cannot execute available_usernames'
);

SELECT function_privs_are(
  'public', 'available_usernames', ARRAY['text[]']::name[], 'authenticated', ARRAY['EXECUTE'],
  'a signed-in user can execute available_usernames'
);

-- This one is not SECURITY DEFINER: the check constraint on profiles.username
-- calls it as whoever is writing the row, so the write roles need EXECUTE or
-- saving a profile fails on privileges instead of on the rule.
SELECT function_privs_are(
  'public', 'is_reserved_username', ARRAY['text']::name[], 'anon', ARRAY[]::text[],
  'anon cannot execute is_reserved_username'
);

SELECT function_privs_are(
  'public', 'is_reserved_username', ARRAY['text']::name[], 'authenticated', ARRAY['EXECUTE'],
  'a signed-in user can execute is_reserved_username'
);

SELECT * FROM finish();
ROLLBACK;

-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

-- Reviewed for the three things the diff cannot decide on its own.
--
-- Order: public.is_reserved_username is created before the check constraint
-- that calls it, which is the one ordering this file depends on. The generated
-- order already satisfies it, so nothing was rearranged.
--
-- check_function_bodies = false is load-bearing rather than incidental:
-- public.available_usernames reads profiles.username, and the column is added
-- further down. Without it the function would fail to create.
--
-- Grants: the three REVOKE ... FROM anon lines are added by hand. The diff
-- writes only REVOKE ... FROM PUBLIC, which is enough here because anon holds
-- no direct grant on these functions in this database. It is not enough
-- everywhere: a database whose default privileges hand new public functions to
-- anon gives it a grant of its own, and revoking from PUBLIC leaves that in
-- place. supabase/schemas/README.md describes the same gap for tables, and
-- 20260809060236_create_profiles.sql corrects it there the same way.
--
-- Locks and rewrites: every ADD CONSTRAINT here takes ACCESS EXCLUSIVE and
-- reads every row, and the display_name rule is dropped and re-added rather
-- than widened. That is free because public.profiles is empty in this
-- unreleased history. Against a table that already holds rows, the tightened
-- length rule would reject any display_name over 30 characters and abort the
-- migration, so a project with real users has to check for those values first
-- and use ADD CONSTRAINT ... NOT VALID followed by VALIDATE CONSTRAINT to keep
-- writes running.

SET check_function_bodies = false;

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_display_name_usable;

CREATE FUNCTION public.available_usernames (
  candidates text[]
)
  RETURNS text[]
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select coalesce(array_agg(entry.candidate order by entry.position), '{}'::text[])
  from (
    select candidate, position
    from unnest(candidates) with ordinality as flattened(candidate, position)
    order by position
    limit 10
  ) as entry
  where entry.candidate ~ '^[a-z0-9_]{3,20}$'
    and not public.is_reserved_username(entry.candidate)
    and not exists (
      select 1 from public.profiles where public.profiles.username = entry.candidate
    );
$function$;

COMMENT ON FUNCTION public.available_usernames(text[]) IS 'Filters a caller''s candidate account ids down to the free ones, in the order given. At most 10 per call.';

REVOKE ALL ON FUNCTION public.available_usernames(text[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.available_usernames(text[]) FROM anon;

GRANT ALL ON FUNCTION public.available_usernames(text[]) TO authenticated;

CREATE FUNCTION public.is_reserved_username (
  candidate text
)
  RETURNS boolean
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select candidate = any (
    array['admin', 'administrator', 'support', 'official', 'system']
  );
$function$;

COMMENT ON FUNCTION public.is_reserved_username(text) IS 'True for account ids the product keeps for itself. Derived projects extend the list here.';

REVOKE ALL ON FUNCTION public.is_reserved_username(text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_reserved_username(text) FROM anon;

GRANT ALL ON FUNCTION public.is_reserved_username(text) TO authenticated;

GRANT ALL ON FUNCTION public.is_reserved_username(text) TO service_role;

CREATE FUNCTION public.username_status (
  candidate text
)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select case
    when candidate is null or candidate !~ '^[a-z0-9_]{3,20}$' then 'invalid'
    when public.is_reserved_username(candidate) then 'reserved'
    when exists (
      select 1 from public.profiles where public.profiles.username = candidate
    ) then 'taken'
    else 'available'
  end;
$function$;

COMMENT ON FUNCTION public.username_status(text) IS 'One of available, taken, reserved, invalid for a candidate account id. Exposes no profile rows.';

REVOKE ALL ON FUNCTION public.username_status(text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.username_status(text) FROM anon;

GRANT ALL ON FUNCTION public.username_status(text) TO authenticated;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_usable CHECK (display_name IS NULL OR length(btrim(display_name)) >= 1 AND length(btrim(display_name)) <= 30);

ALTER TABLE public.profiles
  ADD COLUMN username text;

COMMENT ON COLUMN public.profiles.username IS 'Public account id, lowercase only. Null until the person finishes onboarding.';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_key UNIQUE (username);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_not_reserved CHECK (username IS NULL OR NOT public.is_reserved_username(username));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_usable CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$'::text);

REVOKE UPDATE (avatar_url, display_name) ON public.profiles FROM authenticated;

GRANT UPDATE (avatar_url, display_name, username) ON public.profiles TO authenticated;
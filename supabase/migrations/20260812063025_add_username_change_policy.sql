-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE OR REPLACE FUNCTION public.available_usernames (
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
    and not public.is_protected_username(entry.candidate, (select auth.uid()))
    and not exists (
      select 1
      from public.profiles
      where public.profiles.username = entry.candidate
        and public.profiles.id is distinct from (select auth.uid())
    );
$function$;

CREATE FUNCTION public.guard_username_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if old.username is not null
    and old.username_locked_until is not null
    and old.username_locked_until > now()
  then
    raise exception 'Account id is locked until %', old.username_locked_until
      using errcode = 'check_violation';
  end if;

  if new.username is not null and public.is_protected_username(new.username, new.id) then
    -- The same code the unique index raises. To the person asking, an id somebody
    -- else gave up last week and an id somebody else holds today are one answer:
    -- not yours, pick another.
    raise exception 'Account id % is still protected', new.username
      using errcode = 'unique_violation';
  end if;

  -- A first id costs nothing and retires nothing: there is no previous id to hold
  -- back, and locking here would trap someone in the value they just typed.
  if old.username is null then
    return new;
  end if;

  -- Taking back an id this account retired earlier releases it, so the row does
  -- not sit there blocking the account that now holds the id.
  delete from public.retired_usernames
  where public.retired_usernames.username = new.username
    and public.retired_usernames.retired_by = new.id;

  -- `on conflict` covers the same id being retired twice: a -> b -> a -> b leaves
  -- one row for `b`, protected from the most recent release rather than the first.
  insert into public.retired_usernames (username, retired_by, protected_until)
  values (old.username, new.id, now() + public.username_change_interval())
  on conflict (username) do update
  set retired_by = excluded.retired_by,
      retired_at = now(),
      protected_until = excluded.protected_until;

  new.username_changed_at := now();
  new.username_locked_until := now() + public.username_change_interval();

  return new;
end;
$function$;

COMMENT ON FUNCTION public.guard_username_change() IS 'Enforces the account id lock, protects the previous id, and stamps the next allowed change.';

REVOKE ALL ON FUNCTION public.guard_username_change() FROM PUBLIC;

CREATE FUNCTION public.is_protected_username (
  candidate text,
  owner     uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.retired_usernames
    where public.retired_usernames.username = candidate
      and public.retired_usernames.protected_until > now()
      and public.retired_usernames.retired_by is distinct from owner
  );
$function$;

COMMENT ON FUNCTION public.is_protected_username(text,uuid) IS 'True while another account''s previous id is still protected. Reads retired_usernames as owner.';

REVOKE ALL ON FUNCTION public.is_protected_username(text, uuid) FROM PUBLIC;

CREATE FUNCTION public.username_change_interval()
  RETURNS interval
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select interval '30 days';
$function$;

COMMENT ON FUNCTION public.username_change_interval() IS 'How long an account id stays locked after a change, and how long the previous id stays protected.';

CREATE OR REPLACE FUNCTION public.username_status (
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
      select 1
      from public.profiles
      where public.profiles.username = candidate
        and public.profiles.id is distinct from (select auth.uid())
    ) then 'taken'
    when public.is_protected_username(candidate, (select auth.uid())) then 'taken'
    else 'available'
  end;
$function$;

COMMENT ON COLUMN public.profiles.avatar_url IS 'Provider-supplied image. Providers only fill this while it is null and the person has not chosen their own.';

ALTER TABLE public.profiles
  ADD COLUMN avatar_path text;

COMMENT ON COLUMN public.profiles.avatar_path IS 'Object path in the avatars bucket for a picture this person uploaded. Beats avatar_url when set.';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_path_owned CHECK (avatar_path IS NULL OR length(avatar_path) <= 512 AND avatar_path ~~ (id::text || '/%'::text));

ALTER TABLE public.profiles
  ADD COLUMN avatar_chosen_by_user boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.profiles.avatar_chosen_by_user IS 'True once the person picked or deleted a picture. Blocks providers from filling avatar_url again.';

ALTER TABLE public.profiles
  ADD COLUMN username_changed_at timestamp with time zone;

COMMENT ON COLUMN public.profiles.username_changed_at IS 'When the account id last changed. Null while the person still holds the id they chose at onboarding.';

ALTER TABLE public.profiles
  ADD COLUMN username_locked_until timestamp with time zone;

COMMENT ON COLUMN public.profiles.username_locked_until IS 'When the account id may change again. Written by the trigger, so the server owns the instant.';

REVOKE UPDATE (avatar_url, display_name, username) ON public.profiles FROM authenticated;

GRANT UPDATE (avatar_chosen_by_user, avatar_path, avatar_url, display_name, username) ON public.profiles TO authenticated;

CREATE TRIGGER profiles_guard_username_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (new.username IS DISTINCT FROM old.username)
  EXECUTE FUNCTION public.guard_username_change();

CREATE TABLE public.retired_usernames (
  username        text                     NOT NULL,
  retired_by      uuid                     NOT NULL,
  retired_at      timestamp with time zone DEFAULT now() NOT NULL,
  protected_until timestamp with time zone NOT NULL
);

COMMENT ON TABLE public.retired_usernames IS 'Account ids released by a rename, held back from other accounts until protected_until.';

ALTER TABLE public.retired_usernames
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.retired_usernames
  ADD CONSTRAINT retired_usernames_pkey PRIMARY KEY (username);

ALTER TABLE public.retired_usernames
  ADD CONSTRAINT retired_usernames_retired_by_fkey FOREIGN KEY (retired_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.retired_usernames
  ADD CONSTRAINT retired_usernames_username_usable CHECK (username ~ '^[a-z0-9_]{3,20}$'::text);

-- Added by hand: this database grants REFERENCES, TRIGGER and TRUNCATE on every
-- new table in `public` to anon, authenticated and service_role by default. Those
-- privileges arrive with CREATE TABLE, so they are not a schema difference and the
-- generated diff cannot see them. RLS does not restrain TRUNCATE, so without this
-- an `authenticated` caller could empty the table that holds the protection.
REVOKE ALL ON public.retired_usernames FROM anon, authenticated, service_role;

GRANT ALL ON public.retired_usernames TO service_role;

CREATE INDEX retired_usernames_protected_until_idx ON public.retired_usernames (protected_until);
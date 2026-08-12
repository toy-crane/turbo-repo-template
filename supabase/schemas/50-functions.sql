-- Functions and the triggers that call them.
--
-- Both functions run with an empty `search_path` and name every object in full.
-- A `security definer` function that resolves names through a caller-controlled
-- search_path can be pointed at an attacker's table, so the empty path is what
-- makes the fully qualified names load-bearing rather than a style choice.

-- Creates the profile row for a new Supabase user.
--
-- This runs inside the signup transaction: if it raises, the whole signup fails.
-- So it does one insert and nothing else. It does not read provider metadata,
-- call other services, or branch on the sign-in method. `on conflict do nothing`
-- keeps a re-run or a backfilled row from turning into a signup error.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates public.profiles row for a new auth.users row. Identity only, no provider metadata.';

-- Only the trigger calls this. The Data API roles must not reach it, and
-- `create function` grants EXECUTE to PUBLIC by default, so revoke it.
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Stamps `updated_at` when a profile actually changes.
--
-- `security invoker` is the right level here: this only rewrites a column of the
-- row the caller is already updating, so it needs no privileges of its own.
create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at on a row that changed. Paired with a WHEN clause that skips no-op updates.';

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- The `when` clause is what keeps `updated_at` honest: an update that writes the
-- same values never fires, so the column records real changes rather than write
-- attempts.
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  when (old.* is distinct from new.*)
  execute function public.set_updated_at();

-- How long a changed account id is locked, and how long the old one is held back.
--
-- One function rather than the literal repeated across the trigger and both
-- availability functions: the two periods are the same period in the decision, and
-- a change that moved one of them would otherwise leave an id that is free to take
-- but locked to give up, or the reverse.
--
-- IMMUTABLE so it costs nothing where it is called per row.
create function public.username_change_interval()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '30 days';
$$;

comment on function public.username_change_interval() is
  'How long an account id stays locked after a change, and how long the previous id stays protected.';

-- True while an account id belongs to somebody else's rename and is still held back.
--
-- `owner` is the account asking. Its own retired ids do not block it: someone who
-- renamed away and wants their previous id back is the one person no one can
-- confuse it with.
create function public.is_protected_username(candidate text, owner uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.retired_usernames
    where public.retired_usernames.username = candidate
      and public.retired_usernames.protected_until > now()
      and public.retired_usernames.retired_by is distinct from owner
  );
$$;

comment on function public.is_protected_username(text, uuid) is
  'True while another account''s previous id is still protected. Reads retired_usernames as owner.';

revoke all on function public.is_protected_username(text, uuid) from public, anon, authenticated;

-- Answers "can I have this account id?" without widening who may read profiles.
--
-- `security definer` is the whole point: `profiles_select_own` limits a signed-in
-- user to their own row, so a client cannot discover on its own whether an id is
-- free. This runs as the owner to look, and returns one word about the id the
-- caller already typed. No row, no column, and no other person's values leave
-- the function.
--
-- Reserved is decided before taken so a name the product keeps for itself reads
-- as unavailable rather than as somebody else's.
--
-- "Taken" skips the caller's own row. The edit screen asks about the id the person
-- already holds every time they open it, and counting their own row would answer
-- that their own id is somebody else's. Onboarding is unaffected: a caller with no
-- id yet has no row to skip.
--
-- An id another account gave up reads as taken rather than as its own state. The
-- person asking cannot have it and cannot wait usefully for it either, and naming
-- the protection would say that a specific stranger used to hold it.
create function public.username_status(candidate text)
returns text
language sql
security definer
stable
set search_path = ''
as $$
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
$$;

comment on function public.username_status(text) is
  'One of available, taken, reserved, invalid for a candidate account id. Exposes no profile rows.';

revoke all on function public.username_status(text) from public, anon;
grant execute on function public.username_status(text) to authenticated;

-- Keeps only the ids from `candidates` that a person could actually take.
--
-- The app builds the alternatives it wants to offer and this says which of them
-- are free, so the screen never shows a suggestion that fails the moment it is
-- pressed. Order is preserved: the caller's preference decides what appears
-- first.
--
-- The ten is a limit on how much guessing one call can do. Availability checks
-- are inherently a way to probe which ids exist, and a caller that could pass a
-- thousand candidates at once would turn one request into a thousand answers.
--
-- It is taken after unnest rather than by slicing the argument. `text[]` does
-- not fix the number of dimensions, and `candidates[1:10]` cuts only the first
-- one — a 2 by 11 array would walk straight past the limit while looking like
-- it obeyed. unnest flattens whatever shape arrived, so counting there counts
-- what the function actually answers for.
create function public.available_usernames(candidates text[])
returns text[]
language sql
security definer
stable
set search_path = ''
as $$
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
$$;

comment on function public.available_usernames(text[]) is
  'Filters a caller''s candidate account ids down to the free ones, in the order given. At most 10 per call.';

revoke all on function public.available_usernames(text[]) from public, anon;
grant execute on function public.available_usernames(text[]) to authenticated;

-- Decides every rename: whether it may happen, and what it costs.
--
-- This is the only place the two periods are enforced, and it has to be here
-- rather than in the client or in a check constraint. `username_status` answers
-- about the moment it was asked, and the id can be renamed into or protected
-- between that answer and this write. A check constraint cannot see another table
-- or the row's previous value, so neither the lock nor the protection can be
-- expressed as one.
--
-- `security definer` for `retired_usernames` alone: `authenticated` holds nothing
-- on that table, so the rename writes it through this function or not at all.
--
-- Two rules, and they cover different writes. A protected id may not be taken by
-- anyone, including an account choosing its first id at onboarding — otherwise the
-- shortest way to somebody's released id is to sign up rather than to rename. The
-- lock and the retirement only apply to a real change, so someone who has just
-- picked their first id can still fix it.
create function public.guard_username_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

comment on function public.guard_username_change() is
  'Enforces the account id lock, protects the previous id, and stamps the next allowed change.';

revoke all on function public.guard_username_change() from public, anon, authenticated;

-- The `when` clause covers every write that moves the id, including the null ->
-- value one at onboarding, because the protection has to hold for a new account
-- too. A profile that saves a new picture and the same id does not fire this at
-- all, which is what lets someone edit the rest of their profile while the id is
-- locked.
create trigger profiles_guard_username_change
  before update on public.profiles
  for each row
  when (new.username is distinct from old.username)
  execute function public.guard_username_change();

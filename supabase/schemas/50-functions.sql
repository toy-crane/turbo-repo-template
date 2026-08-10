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
-- "Taken" counts every row, including the caller's own. That is right for
-- onboarding, where the caller has no id yet. A screen that lets someone change
-- an id they already hold has to exclude their own row here, or keeping their
-- current id will read as taken.
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
      select 1 from public.profiles where public.profiles.username = candidate
    ) then 'taken'
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
    and not exists (
      select 1 from public.profiles where public.profiles.username = entry.candidate
    );
$$;

comment on function public.available_usernames(text[]) is
  'Filters a caller''s candidate account ids down to the free ones, in the order given. At most 10 per call.';

revoke all on function public.available_usernames(text[]) from public, anon;
grant execute on function public.available_usernames(text[]) to authenticated;

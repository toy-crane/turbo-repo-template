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

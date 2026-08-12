-- Access control for public.profiles.
--
-- `config.toml` does not auto-expose new tables, so a table is unreachable
-- through the Data API until it is granted explicitly. Granting without RLS
-- would then expose every row, so the two always travel together.
alter table public.profiles enable row level security;

-- `anon` gets no policy and no grant. An unauthenticated caller holding the
-- publishable key can neither read nor change any profile.
--
-- `(select auth.uid())` rather than a bare `auth.uid()`: the subquery form is
-- evaluated once per statement instead of once per row.
create policy profiles_select_own on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- `using` decides which rows the user may update; `with check` decides what the
-- row may look like afterwards. Both are required — with `using` alone a user
-- could take a row they own and hand it to another user's id.
create policy profiles_update_own on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert or delete policy. RLS denies what no policy allows, so profile
-- creation stays with the trigger and deletion follows the user through
-- `on delete cascade`.

-- Default privileges in this database already hand every new table in `public`
-- to anon, authenticated, and service_role — including TRUNCATE, which RLS does
-- not restrain. Revoke first so the grants below are the table's whole access
-- surface rather than an addition to whatever the defaults happened to give.
revoke all on table public.profiles from anon, authenticated, service_role;

-- Column-scoped update: `id` and `created_at` are identity and history, so a
-- user may not rewrite them even on their own row. `with check` above already
-- guards `id`; this also covers `created_at`, which a policy cannot express.
-- `updated_at` is the database's to set, through the trigger.
-- `username_changed_at` and `username_locked_until` are missing from the update
-- grant on purpose. They are the record of the rule, so a client that could write
-- them could clear its own lock and rename as often as it liked. The trigger sets
-- both, and it runs as owner.
grant select on table public.profiles to authenticated;
grant update (avatar_chosen_by_user, avatar_path, avatar_url, display_name, username)
  on table public.profiles to authenticated;

-- The backend role bypasses RLS and is reached only with the secret key.
grant all on table public.profiles to service_role;

-- Access control for public.retired_usernames.
--
-- RLS with no policy at all for `anon` and `authenticated`: this table answers
-- "which ids are about to come free", which is a queue to camp on rather than
-- anything a person needs. The trigger writes it and the availability functions
-- read it, both as owner, so no client role needs to reach it directly.
alter table public.retired_usernames enable row level security;

revoke all on table public.retired_usernames from anon, authenticated, service_role;

grant all on table public.retired_usernames to service_role;

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
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url, username) on table public.profiles to authenticated;

-- The backend role bypasses RLS and is reached only with the secret key.
grant all on table public.profiles to service_role;

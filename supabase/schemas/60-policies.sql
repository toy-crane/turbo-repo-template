-- Access control for the sample table.
--
-- `config.toml` does not auto-expose new tables, so a table is unreachable
-- through the Data API until it is granted explicitly. Granting without RLS
-- would then expose every row, so the two always travel together.
alter table public.notes enable row level security;

-- Read-only for everyone: this sample carries no user data. Do not promote this
-- table by adding user columns to it — `using (true)` would then expose every
-- row to anyone holding the publishable key. Create a new table instead and
-- scope its rows to their owner, for example
--   using ((select auth.uid()) = user_id)
-- pairing an update policy's `using` with a matching `with check`.
create policy notes_select_public on public.notes
  for select
  to anon, authenticated
  using (true);

-- Default privileges in this database already hand every new table in `public`
-- to anon, authenticated, and service_role — including TRUNCATE, which RLS does
-- not restrain. Revoke first so the grants below are the table's whole access
-- surface rather than an addition to whatever the defaults happened to give.
revoke all on table public.notes from anon, authenticated, service_role;

-- No insert, update, or delete policy: RLS denies what no policy allows, so
-- writes are rejected for both roles even though select is granted.
grant select on table public.notes to anon, authenticated;

-- The backend role bypasses RLS and is reached only with the secret key.
grant all on table public.notes to service_role;

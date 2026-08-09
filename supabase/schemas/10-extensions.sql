-- Extensions live in the `extensions` schema, not `public`, so they never appear
-- in the Data API surface or in the generated Database type.

-- pgTAP is what `bun run db:test` runs the assertions with. It has no runtime
-- role in the app: nothing outside supabase/tests/ calls it.
create extension if not exists pgtap with schema extensions;

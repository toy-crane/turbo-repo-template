-- Extensions live in the `extensions` schema, not `public`, so they never appear
-- in the Data API surface or in the generated Database type.

-- pgTAP is what `bun run db:test` runs the assertions with. It has no runtime
-- role in the app: nothing outside supabase/tests/ calls it.
--
-- It is part of the migration history, so it installs in every environment the
-- history is applied to, production included. That is the path Supabase's own
-- testing guide takes, and the cost is a few hundred functions in `extensions`,
-- which the Data API does not expose. It also means `supabase db lint` over the
-- whole database reports pgTAP's internals, so `bun run db:lint` asks for the
-- `public` schema only.
create extension if not exists pgtap with schema extensions;

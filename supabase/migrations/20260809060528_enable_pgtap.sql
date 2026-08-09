-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

-- `IF NOT EXISTS` added by hand. It is in supabase/schemas/10-extensions.sql,
-- but the declarative diff drops it: the diff describes the difference between
-- two databases, and from that view the extension simply does not exist yet.
-- Without it, applying this history to a database that already has pgTAP raises
-- 42710 and aborts the migration and every one after it. A local `db reset`
-- always starts empty, so it can never catch that.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
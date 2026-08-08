-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

CREATE TABLE public.notes (
  id         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  title      text                     NOT NULL,
  body       text                     DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.notes IS 'Sample public read-only notes. Replace with real product tables.';

ALTER TABLE public.notes
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_pkey PRIMARY KEY (id);

ALTER TABLE public.notes
  ADD CONSTRAINT notes_title_not_blank CHECK (length(btrim(title)) > 0);

-- Added by hand. The declarative diff does not emit the REVOKE in
-- supabase/schemas/60-policies.sql, because default privileges apply when
-- CREATE TABLE runs rather than showing up as a schema difference. Without this,
-- replaying the migration leaves anon holding REFERENCES, TRIGGER, and TRUNCATE,
-- and RLS does not restrain TRUNCATE.
REVOKE ALL ON public.notes FROM anon, authenticated, service_role;

GRANT SELECT ON public.notes TO anon;

GRANT SELECT ON public.notes TO authenticated;

GRANT ALL ON public.notes TO service_role;

CREATE INDEX notes_created_at_idx ON public.notes (created_at DESC);

CREATE POLICY notes_select_public ON public.notes
  FOR SELECT
  TO anon, authenticated
  USING (true);
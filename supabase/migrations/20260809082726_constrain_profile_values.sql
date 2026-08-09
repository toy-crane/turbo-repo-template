-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

-- Both statements take an ACCESS EXCLUSIVE lock and read every row. That is
-- free here, because public.profiles is created by an earlier migration in the
-- same unreleased history and holds nothing yet. Adding a constraint to a table
-- that is already large in production wants ADD CONSTRAINT ... NOT VALID
-- followed by VALIDATE CONSTRAINT instead, which keeps writes running.

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_url_usable CHECK (avatar_url IS NULL OR length(avatar_url) <= 2048 AND avatar_url ~~ 'https://%'::text);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_usable CHECK (display_name IS NULL OR length(display_name) <= 100 AND btrim(display_name) <> ''::text);
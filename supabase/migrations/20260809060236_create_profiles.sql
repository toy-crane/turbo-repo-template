-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP POLICY notes_select_public ON public.notes;

DROP TABLE public.notes;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates public.profiles row for a new auth.users row. Identity only, no provider metadata.';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at := now();

  return new;
end;
$function$;

COMMENT ON FUNCTION public.set_updated_at() IS 'Sets updated_at on a row that changed. Paired with a WHEN clause that skips no-op updates.';

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

CREATE TABLE public.profiles (
  id           uuid                     NOT NULL,
  display_name text,
  avatar_url   text,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  updated_at   timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.profiles IS 'User-editable profile, one row per auth.users row. Created by trigger, never by clients.';

COMMENT ON COLUMN public.profiles.display_name IS 'Name shown in the app. Providers only fill this while it is null.';

COMMENT ON COLUMN public.profiles.avatar_url IS 'Image shown in the app. Providers only fill this while it is null.';

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

-- Added by hand. The declarative diff does not emit the REVOKE in
-- supabase/schemas/60-policies.sql, because default privileges apply when
-- CREATE TABLE runs rather than showing up as a schema difference. Without this,
-- replaying the migration leaves anon holding REFERENCES, TRIGGER, and TRUNCATE,
-- and RLS does not restrain TRUNCATE.
REVOKE ALL ON public.profiles FROM anon, authenticated, service_role;

GRANT SELECT ON public.profiles TO authenticated;

GRANT UPDATE (avatar_url, display_name) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (old.* IS DISTINCT FROM new.*)
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

-- Added by hand. The trigger above only covers users created from now on, and a
-- declarative diff describes structure, not rows. Databases that already hold
-- `auth.users` rows get their missing profiles here. `on conflict do nothing`
-- keeps any profile a user already edited exactly as it is.
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
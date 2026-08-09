-- One profile row per Supabase user. `auth.users` stays the source of identity;
-- this table holds only the values a user may edit about themselves, so provider
-- data (email, provider name, avatar) is never duplicated here.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'User-editable profile, one row per auth.users row. Created by trigger, never by clients.';

comment on column public.profiles.display_name is
  'Name shown in the app. Providers only fill this while it is null.';

comment on column public.profiles.avatar_url is
  'Image shown in the app. Providers only fill this while it is null.';

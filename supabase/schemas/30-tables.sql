-- One profile row per Supabase user. `auth.users` stays the source of identity;
-- this table holds only the values a user may edit about themselves, so provider
-- data (email, provider name, avatar) is never duplicated here.
-- These two columns are the only ones a client may write, so they are the only
-- place a client can put anything it likes. `text` alone accepts a name made of
-- spaces, a name the size of a file, and an `avatar_url` carrying a `javascript:`
-- or `data:` payload. RLS decides *whose* row may change; these decide what may
-- go in it, and nothing else in the app does.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  -- The object in the `avatars` bucket holding a picture this person uploaded.
  -- A path rather than a URL: the same row is read from a simulator, a device and
  -- production, and each reaches storage on a different host. Storing
  -- `http://127.0.0.1:54321/...` would pin the row to whichever machine wrote it.
  avatar_path text,
  -- True once the person picked or deleted their own picture. `fillEmptyProfileValues`
  -- offers a provider picture only while this is false, which is what keeps a
  -- deleted photo deleted: without it, `avatar_url` is null again and the next
  -- sign-in would helpfully put the provider's picture straight back.
  avatar_chosen_by_user boolean not null default false,
  -- Set before account deletion starts. Avatar Storage policies lock this row
  -- while checking the value, which lets the delete path wait for older writes
  -- and refuse every new write before it begins removing objects.
  account_deletion_started_at timestamptz,
  -- Both are written by the username trigger, never by a client. `username_changed_at`
  -- is history; `username_locked_until` is the answer the edit screen shows, so the
  -- server decides the instant and the screen only formats it in the local date.
  username_changed_at timestamptz,
  username_locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_usable check (
    display_name is null
    or length(btrim(display_name)) between 1 and 30
  ),
  -- The pattern accepts lowercase only, so it is also what makes the UNIQUE
  -- above case-insensitive: two ids that differ only in case cannot both be
  -- stored, because the uppercase one cannot be stored at all. A direct write
  -- that skipped the app's normalization is rejected rather than quietly
  -- rewritten, so what the client sent and what the row holds never diverge.
  constraint profiles_username_usable check (
    username is null
    or username ~ '^[a-z0-9_]{3,20}$'
  ),
  constraint profiles_username_not_reserved check (
    username is null
    or not public.is_reserved_username(username)
  ),
  constraint profiles_avatar_url_usable check (
    avatar_url is null
    or (length(avatar_url) <= 2048 and avatar_url like 'https://%')
  ),
  -- The owner's id is the first path segment, which is the same shape the storage
  -- policies below match on. Writing it here as well means a row cannot claim a
  -- file it does not own even if it reached the table some other way.
  constraint profiles_avatar_path_owned check (
    avatar_path is null
    or (length(avatar_path) <= 512 and avatar_path like id::text || '/%')
  )
);

comment on table public.profiles is
  'User-editable profile, one row per auth.users row. Created by trigger, never by clients.';

comment on column public.profiles.display_name is
  'Name shown in the app. Providers only fill this while it is null.';

comment on column public.profiles.username is
  'Public account id, lowercase only. Null until the person finishes onboarding.';

comment on column public.profiles.avatar_url is
  'Provider-supplied image. Providers only fill this while it is null and the person has not chosen their own.';

comment on column public.profiles.avatar_path is
  'Object path in the avatars bucket for a picture this person uploaded. Beats avatar_url when set.';

comment on column public.profiles.avatar_chosen_by_user is
  'True once the person picked or deleted a picture. Blocks providers from filling avatar_url again.';

comment on column public.profiles.account_deletion_started_at is
  'Write fence set before account deletion removes avatar objects. Clients cannot change it.';

comment on column public.profiles.username_changed_at is
  'When the account id last changed. Null while the person still holds the id they chose at onboarding.';

comment on column public.profiles.username_locked_until is
  'When the account id may change again. Written by the trigger, so the server owns the instant.';

-- Account ids their previous owner gave up, kept out of reach for a while.
--
-- Without this, someone who renames frees their old id immediately and the next
-- account to take it inherits every mention, screenshot and memory of the person
-- who left it behind.
--
-- No RLS policy and no grant: `authenticated` never reads or writes this table.
-- The trigger fills it and the availability functions read it, both as owner. A
-- client that could select here would have a list of ids to sit and wait for.
create table public.retired_usernames (
  username text primary key,
  -- The account that gave the id up. `on delete cascade` releases it when the
  -- account is gone: nobody is left to be confused with.
  retired_by uuid not null references public.profiles (id) on delete cascade,
  retired_at timestamptz not null default now(),
  -- When anybody else may take it. Stored rather than derived so a change to the
  -- protection period does not silently move ids that are already retired.
  protected_until timestamptz not null,
  constraint retired_usernames_username_usable check (
    username ~ '^[a-z0-9_]{3,20}$'
  )
);

comment on table public.retired_usernames is
  'Account ids released by a rename, held back from other accounts until protected_until.';

-- Every lookup here asks "is this id still protected", never "which ids did this
-- account hold", so the index follows the question rather than the owner.
create index retired_usernames_protected_until_idx
  on public.retired_usernames (protected_until);

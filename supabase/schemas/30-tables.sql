-- Sample table. It exists so the schema → migration → reset → types workflow has
-- something real to run through, and so the generated Database type is not empty.
-- Delete it once the first real table lands.
create table public.notes (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  constraint notes_title_not_blank check (length(btrim(title)) > 0)
);

comment on table public.notes is
  'Sample public read-only notes. Replace with real product tables.';

-- Newest first is the only access path the sample has.
create index notes_created_at_idx on public.notes (created_at desc);

-- Loaded after migrations on every `bun run db:reset`, which starts from an
-- empty database — these inserts assume that and would duplicate rows if run
-- against a populated one. Keep it free of environment-specific ids and secrets.
insert into public.notes (title, body)
values
  ('First note', 'Seeded so a fresh reset has something to read.'),
  ('Second note', 'Replace these rows when the first real table lands.'),
  ('Third note', '');

-- The nickname and account id rules, exercised as the roles that reach them.
--
-- These run against the constraints rather than the app, because the app is not
-- the only thing that can write a profile. A direct PostgREST call, a future
-- server, or a hand-written statement has to land in the same place.
BEGIN;
SELECT plan(35);

INSERT INTO auth.users (id, email)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'name-a@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'name-b@example.test');

-- These checks walk one row through many spellings to cover the format rules, and
-- the rename policy would lock the row after the first accepted one. It stands
-- down here and is exercised in full by profiles_username_change_test.sql, so the
-- two files each say one thing. ROLLBACK puts the trigger back.
ALTER TABLE public.profiles DISABLE TRIGGER profiles_guard_username_change;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

-- ── nickname length ──
--
-- The spec measures 1–30 characters after trimming, and length() counts
-- characters rather than bytes. The Korean values are what prove that: three
-- bytes each, so a byte-based rule would reject the 30-character one.
SELECT lives_ok(
  $$update public.profiles
    set display_name = repeat('가', 30)
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a 30 character nickname is accepted'
);

SELECT throws_ok(
  $$update public.profiles
    set display_name = repeat('가', 31)
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  NULL,
  'a 31 character nickname is rejected'
);

-- Surrounding spaces are not part of the name, so they are not part of the
-- length either. The app trims before saving; this is what keeps a direct write
-- from getting a longer name past the rule by padding it.
SELECT lives_ok(
  $$update public.profiles
    set display_name = '  ' || repeat('가', 30) || '  '
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'the length is measured after trimming'
);

SELECT throws_ok(
  $$update public.profiles
    set display_name = '   '
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  NULL,
  'a nickname of only spaces is rejected'
);

-- The accepted end of the range, so a rule that quietly tightened to a longer
-- minimum would fail here rather than pass everything.
SELECT lives_ok(
  $$update public.profiles
    set display_name = '민'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a one character nickname is accepted'
);

-- ── account id format ──
SELECT throws_ok(
  $$update public.profiles set username = 'ab'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  NULL,
  'an account id under 3 characters is rejected'
);

SELECT throws_ok(
  $$update public.profiles set username = repeat('a', 21)
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  NULL,
  'an account id over 20 characters is rejected'
);

SELECT throws_ok(
  $$update public.profiles set username = 'toy-crane'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  NULL,
  'an account id with a character outside a-z, 0-9 and _ is rejected'
);

-- This one is the lowercase-storage rule. The database does not quietly
-- rewrite a capital letter, it refuses it, so the value a client sent and the
-- value the row holds are never two different things.
SELECT throws_ok(
  $$update public.profiles set username = 'Toycrane'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  NULL,
  'an account id carrying a capital letter is rejected rather than lowercased'
);

SELECT lives_ok(
  $$update public.profiles set username = '_toy__crane_'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'underscores are allowed at the start, the end and in a row'
);

-- Both ends of the accepted range. Without these a pattern that tightened to
-- {4,19} would still pass every rejection test above.
SELECT lives_ok(
  $$update public.profiles set username = 'abc'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'exactly 3 characters is accepted'
);

SELECT lives_ok(
  $$update public.profiles set username = repeat('a', 20)
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'exactly 20 characters is accepted'
);

SELECT lives_ok(
  $$update public.profiles set username = 'toycrane'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a well formed account id is accepted'
);

SELECT is(
  (SELECT username FROM public.profiles WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'toycrane',
  'and it is stored exactly as sent'
);

-- ── reserved ──
SELECT throws_ok(
  $$update public.profiles set username = 'admin'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  NULL,
  'a reserved account id is rejected'
);

SELECT throws_ok(
  $$update public.profiles set username = 'system'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  NULL,
  'every name in the reserved list is rejected, not just the first'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

-- ── uniqueness, including case ──
--
-- Two ids that differ only in case can never both exist, and it takes two rules
-- to say so: the format check refuses the capitalised spelling outright, and the
-- unique constraint refuses the lowercase one that is already taken.
SELECT throws_ok(
  $$update public.profiles set username = 'TOYCRANE'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '23514',
  NULL,
  'the same id in capitals cannot be stored at all'
);

SELECT throws_ok(
  $$update public.profiles set username = 'toycrane'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '23505',
  NULL,
  'an account id another person already holds is rejected'
);

-- ── the final save is one change or none ──
--
-- The screen sends the nickname and the account id together. If the id turns
-- out to be taken between the availability check and this statement, the
-- nickname must not be left behind on its own.
SELECT throws_ok(
  $$update public.profiles
    set display_name = '경쟁한 닉네임', username = 'toycrane'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '23505',
  NULL,
  'one update carrying both values fails as a whole when the id is taken'
);

SELECT is(
  (SELECT display_name FROM public.profiles WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  NULL::text,
  'and the nickname from that same statement is not stored'
);

SELECT lives_ok(
  $$update public.profiles
    set display_name = '김민서', username = 'minseokim'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  'the same statement succeeds once the id is free'
);

SELECT results_eq(
  $$select display_name, username from public.profiles
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  $$values ('김민서'::text, 'minseokim'::text)$$,
  'and both values land together'
);

-- ── availability, without widening what a client may read ──
--
-- The reader is signed in as B, and 'toycrane' belongs to A. RLS hides A's row
-- from B entirely, so a plain select cannot answer this; the function can,
-- and it answers with one word rather than a row.
SELECT is(
  (SELECT count(*) FROM public.profiles),
  1::bigint,
  'B still sees only their own profile'
);

SELECT is(
  public.username_status('toycrane'),
  'taken',
  'an id held by someone else reads as taken'
);

SELECT is(
  public.username_status('admin'),
  'reserved',
  'a reserved id reads as reserved rather than as taken'
);

SELECT is(
  public.username_status('freeid'),
  'available',
  'an unused id reads as available'
);

SELECT is(
  public.username_status('no'),
  'invalid',
  'a malformed id reads as invalid'
);

SELECT is(
  public.username_status(NULL),
  'invalid',
  'a missing id reads as invalid rather than raising'
);

SELECT is(
  public.available_usernames(
    ARRAY['toycrane', 'admin', 'toycrane17', 'no', 'toycrane24', 'Toycrane']
  ),
  ARRAY['toycrane17', 'toycrane24'],
  'taken, reserved and malformed candidates are dropped and the order is kept'
);

SELECT is(
  array_length(
    public.available_usernames(
      ARRAY[
        'free01', 'free02', 'free03', 'free04', 'free05', 'free06',
        'free07', 'free08', 'free09', 'free10', 'free11', 'free12'
      ]
    ),
    1
  ),
  10,
  'one call answers for at most ten candidates'
);

-- `text[]` accepts any number of dimensions, so the limit has to hold for a
-- shape the caller was never expected to send. Slicing the argument would let
-- this one through: 2 by 6 cuts to 2 by 6 and answers for all twelve.
SELECT is(
  array_length(
    public.available_usernames(
      ARRAY[
        ARRAY['free01', 'free02', 'free03', 'free04', 'free05', 'free06'],
        ARRAY['free07', 'free08', 'free09', 'free10', 'free11', 'free12']
      ]
    ),
    1
  ),
  10,
  'the ten candidate limit holds for a multi-dimensional array too'
);

SELECT is(
  public.available_usernames(ARRAY[]::text[]),
  ARRAY[]::text[],
  'no candidates gives an empty answer rather than null'
);

RESET ROLE;

-- ── the publishable key reaches none of it ──
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$select public.username_status('toycrane')$$,
  '42501',
  NULL,
  'anon cannot ask whether an id is taken'
);

SELECT throws_ok(
  $$select public.available_usernames(ARRAY['toycrane'])$$,
  '42501',
  NULL,
  'anon cannot ask for free ids'
);

SELECT throws_ok(
  $$select public.is_reserved_username('admin')$$,
  '42501',
  NULL,
  'anon cannot read the reserved list'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;

-- What the Data API roles can actually do, exercised as those roles.
BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'rls-a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'rls-b@example.test');

-- anon holds the publishable key that ships inside the app bundle. It has no
-- grant at all, so it does not get an empty result, it gets refused.
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$select * from public.profiles$$,
  '42501',
  NULL,
  'anon cannot read profiles'
);

SELECT throws_ok(
  $$update public.profiles set display_name = 'Hijacked'$$,
  '42501',
  NULL,
  'anon cannot update profiles'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

SELECT is(
  (SELECT count(*) FROM public.profiles),
  1::bigint,
  'a signed-in user sees one profile'
);

SELECT is(
  (SELECT id FROM public.profiles),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'and it is their own'
);

SELECT lives_ok(
  $$update public.profiles
    set display_name = 'Chosen name', avatar_url = 'https://example.test/a.png'
    where id = '11111111-1111-4111-8111-111111111111'$$,
  'a user can update their own profile'
);

SELECT is(
  (SELECT display_name FROM public.profiles WHERE id = '11111111-1111-4111-8111-111111111111'),
  'Chosen name',
  'the update is stored'
);

-- RLS filters rather than refuses, so reaching for another user's row is a
-- silent no-op. The assertion after RESET ROLE is what proves nothing moved.
SELECT lives_ok(
  $$update public.profiles
    set display_name = 'Hijacked'
    where id = '22222222-2222-4222-8222-222222222222'$$,
  'updating another user''s profile raises nothing'
);

-- RLS decides whose row may change. These decide what may go in it: without
-- them a signed-in user can store a name made of spaces, a name the size of a
-- file, or an avatar_url carrying a javascript: payload, all on their own row.
SELECT throws_ok(
  $$update public.profiles
    set display_name = '   '
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '23514',
  NULL,
  'a display name of only spaces is rejected'
);

SELECT throws_ok(
  $$update public.profiles
    set display_name = repeat('a', 31)
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '23514',
  NULL,
  'an over-long display name is rejected'
);

SELECT throws_ok(
  $$update public.profiles
    set avatar_url = 'javascript:alert(1)'
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '23514',
  NULL,
  'an avatar url that is not https is rejected'
);

SELECT throws_ok(
  $$insert into public.profiles (id) values ('33333333-3333-4333-8333-333333333333')$$,
  '42501',
  NULL,
  'a client cannot create a profile'
);

SELECT throws_ok(
  $$delete from public.profiles where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  NULL,
  'a client cannot delete a profile'
);

RESET ROLE;

SELECT is(
  (SELECT display_name FROM public.profiles WHERE id = '22222222-2222-4222-8222-222222222222'),
  NULL::text,
  'the other user''s profile is unchanged'
);

-- The column grant already keeps id out of an update, which would hide whether
-- the policy also does its job. Widening the grant inside this rolled-back
-- transaction isolates WITH CHECK and proves the two controls are independent.
GRANT UPDATE ON TABLE public.profiles TO authenticated;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

SELECT throws_ok(
  $$update public.profiles
    set id = '22222222-2222-4222-8222-222222222222'
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  NULL,
  'WITH CHECK blocks moving a row to another user even with a table-wide update grant'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;

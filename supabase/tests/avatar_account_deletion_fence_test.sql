-- Avatar writes stop before deletion starts removing objects, even while an
-- already-issued JWT still carries the deleted account's user id.
BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email)
VALUES ('11111111-1111-4111-8111-111111111111', 'avatar-fence@example.test');

SELECT has_column(
  'public', 'profiles', 'account_deletion_started_at',
  'profiles carries the account deletion write fence'
);

SELECT policies_are(
  'storage', 'objects',
  ARRAY[
    'avatars_delete_own',
    'avatars_insert_own',
    'avatars_select_own',
    'avatars_update_own'
  ],
  'avatars carries exactly the four owner policies'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

SELECT lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values (
      'avatars',
      '11111111-1111-4111-8111-111111111111/profile.jpg',
      '11111111-1111-4111-8111-111111111111'
    )$$,
  'an active account can write one file directly inside its avatar folder'
);

SELECT throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values (
      'avatars',
      '11111111-1111-4111-8111-111111111111/nested/profile.jpg',
      '11111111-1111-4111-8111-111111111111'
    )$$,
  '42501',
  NULL,
  'a client cannot create nested avatar paths that a flat cleanup could miss'
);

SELECT throws_ok(
  $$update public.profiles
    set account_deletion_started_at = now()
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  NULL,
  'a client cannot lower or raise its own account deletion fence'
);

RESET ROLE;

UPDATE public.profiles
SET account_deletion_started_at = now()
WHERE id = '11111111-1111-4111-8111-111111111111';

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

SELECT throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values (
      'avatars',
      '11111111-1111-4111-8111-111111111111/late.jpg',
      '11111111-1111-4111-8111-111111111111'
    )$$,
  '42501',
  NULL,
  'a stale JWT cannot insert an avatar after account deletion starts'
);

SELECT lives_ok(
  $$update storage.objects
    set metadata = '{"late":true}'::jsonb
    where bucket_id = 'avatars'
      and name = '11111111-1111-4111-8111-111111111111/profile.jpg'$$,
  'a stale JWT avatar update is filtered rather than raising'
);

RESET ROLE;

SELECT is(
  (
    SELECT metadata
    FROM storage.objects
    WHERE bucket_id = 'avatars'
      AND name = '11111111-1111-4111-8111-111111111111/profile.jpg'
  ),
  NULL::jsonb,
  'the stale JWT did not update the existing avatar'
);

SELECT * FROM finish();
ROLLBACK;

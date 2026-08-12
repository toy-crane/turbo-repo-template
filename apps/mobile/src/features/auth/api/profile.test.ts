import { beforeEach, expect, test } from "@jest/globals";

import {
  createFakeSupabase,
  type FakeSupabase,
} from "@/shared/test/fake-supabase";
import { fillEmptyProfileValues, saveProfileEdit } from "./profile";

const USER_ID = "user-1";

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
});

/**
 * The picture a provider offers is only ever a starting value, and "only fill
 * what is empty" has two halves. An empty `avatar_url` alone is also what a
 * deleted picture looks like, so without the second filter the next sign-in
 * would helpfully undo the deletion.
 */
test("제공자 사진은 비어 있고 사용자가 정하지 않았을 때만 채운다", async () => {
  await fillEmptyProfileValues(fake.client, USER_ID, {
    avatarUrl: "https://provider.example.test/photo.jpg",
    displayName: null,
  });

  const avatarUpdate = fake.updates.at(-1);

  expect(avatarUpdate?.values).toEqual({
    avatar_url: "https://provider.example.test/photo.jpg",
  });
  expect(avatarUpdate?.filters).toEqual([
    { column: "id", operator: "eq", value: USER_ID },
    { column: "avatar_chosen_by_user", operator: "eq", value: false },
    { column: "avatar_url", operator: "is", value: null },
  ]);
});

test("사진을 지우면 제공자 사진까지 비우고 사용자가 정했다고 남긴다", async () => {
  await saveProfileEdit(fake.client, USER_ID, {
    avatarPath: null,
    displayName: "김민서",
    username: "minseokim",
  });

  expect(fake.updates.at(-1)?.values).toEqual({
    // Both, or the deleted picture comes back as the provider's the moment the
    // chosen one is gone.
    avatar_chosen_by_user: true,
    avatar_path: null,
    avatar_url: null,
    display_name: "김민서",
    username: "minseokim",
  });
});

/**
 * Editing a nickname is not a decision about the picture. Sending the avatar
 * columns anyway would clear the photo of everyone who came in to fix a typo.
 */
test("사진을 건드리지 않은 저장은 사진 열을 보내지 않는다", async () => {
  await saveProfileEdit(fake.client, USER_ID, {
    displayName: "김민서",
    username: "minseokim",
  });

  expect(fake.updates.at(-1)?.values).toEqual({
    display_name: "김민서",
    username: "minseokim",
  });
});

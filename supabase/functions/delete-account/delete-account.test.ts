import { assertEquals } from "@std/assert";

import {
  type AccountDeletionAdmin,
  deleteCurrentAccount,
} from "./delete-account.ts";

Deno.test("현재 사용자의 프로필 사진을 지운 뒤 인증 계정을 영구 삭제한다", async () => {
  const calls: Array<[operation: string, value: unknown]> = [];
  const admin: AccountDeletionAdmin = {
    auth: {
      admin: {
        deleteUser: (userId) => {
          calls.push(["deleteUser", userId]);

          return Promise.resolve({ error: null });
        },
      },
    },
    storage: {
      from: (bucket) => {
        calls.push(["from", bucket]);

        return {
          list: (folder) => {
            calls.push(["list", folder]);

            return Promise.resolve({
              data: [{ name: "profile.jpg" }],
              error: null,
            });
          },
          remove: (paths) => {
            calls.push(["remove", paths]);

            return Promise.resolve({ error: null });
          },
        };
      },
    },
  };

  await deleteCurrentAccount(admin, "user-1");

  assertEquals(calls, [
    ["from", "avatars"],
    ["list", "user-1"],
    ["remove", ["user-1/profile.jpg"]],
    ["deleteUser", "user-1"],
  ]);
});

Deno.test("이미 삭제한 계정에 같은 요청이 도착해도 성공으로 끝낸다", async () => {
  const admin: AccountDeletionAdmin = {
    auth: {
      admin: {
        deleteUser: () =>
          Promise.resolve({
            error: {
              code: "user_not_found",
              message: "User not found",
              status: 404,
            },
          }),
      },
    },
    storage: {
      from: () => ({
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ error: null }),
      }),
    },
  };

  await deleteCurrentAccount(admin, "user-1");
});

Deno.test("사용자 폴더의 프로필 사진이 한 페이지보다 많아도 모두 지운다", async () => {
  const storedNames = Array.from(
    { length: 101 },
    (_unused, index) => `profile-${index}.jpg`,
  );
  const admin: AccountDeletionAdmin = {
    auth: {
      admin: {
        deleteUser: () => Promise.resolve({ error: null }),
      },
    },
    storage: {
      from: () => ({
        list: () =>
          Promise.resolve({
            data: storedNames.slice(0, 100).map((name) => ({ name })),
            error: null,
          }),
        remove: (paths) => {
          for (const path of paths) {
            const name = path.slice("user-1/".length);
            const index = storedNames.indexOf(name);

            if (index >= 0) {
              storedNames.splice(index, 1);
            }
          }

          return Promise.resolve({ error: null });
        },
      }),
    },
  };

  await deleteCurrentAccount(admin, "user-1");

  assertEquals(storedNames, []);
});

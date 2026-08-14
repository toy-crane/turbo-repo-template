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
    from: (table) => {
      calls.push(["fromTable", table]);

      return {
        update: (values) => {
          calls.push(["update", values]);

          return {
            eq: (column, value) => {
              calls.push(["eq", [column, value]]);

              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
    storage: {
      from: (bucket) => {
        calls.push(["from", bucket]);

        return {
          list: (folder) => {
            calls.push(["list", folder]);

            return Promise.resolve({
              data: [{ id: "avatar-1", name: "profile.jpg" }],
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

  await deleteCurrentAccount(admin, "user-1", "2026-08-14T00:00:00.000Z");

  assertEquals(calls, [
    ["fromTable", "profiles"],
    [
      "update",
      { account_deletion_started_at: "2026-08-14T00:00:00.000Z" },
    ],
    ["eq", ["id", "user-1"]],
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
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
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
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
    storage: {
      from: () => ({
        list: () =>
          Promise.resolve({
            data: storedNames
              .slice(0, 100)
              .map((name) => ({ id: name, name })),
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

Deno.test("중첩 폴더에 남은 프로필 사진도 실제 파일까지 지운다", async () => {
  const removed: string[][] = [];
  const admin: AccountDeletionAdmin = {
    auth: {
      admin: {
        deleteUser: () => Promise.resolve({ error: null }),
      },
    },
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
    storage: {
      from: () => ({
        list: (folder) => {
          if (folder === "user-1") {
            return Promise.resolve({
              data: [{ id: null, name: "old" }],
              error: null,
            });
          }

          return Promise.resolve({
            data: [{ id: "avatar-1", name: "profile.jpg" }],
            error: null,
          });
        },
        remove: (paths) => {
          removed.push(paths);

          return Promise.resolve({ error: null });
        },
      }),
    },
  };

  await deleteCurrentAccount(admin, "user-1");

  assertEquals(removed, [["user-1/old/profile.jpg"]]);
});

Deno.test("삭제 시작 표시가 실패하면 사진이나 인증 계정을 지우지 않는다", async () => {
  const calls: string[] = [];
  const admin: AccountDeletionAdmin = {
    auth: {
      admin: {
        deleteUser: () => {
          calls.push("deleteUser");

          return Promise.resolve({ error: null });
        },
      },
    },
    from: () => ({
      update: () => ({
        eq: () =>
          Promise.resolve({
            error: { message: "Could not mark account deletion" },
          }),
      }),
    }),
    storage: {
      from: () => {
        calls.push("storage");

        return {
          list: () => Promise.resolve({ data: [], error: null }),
          remove: () => Promise.resolve({ error: null }),
        };
      },
    },
  };

  let failed = false;

  try {
    await deleteCurrentAccount(admin, "user-1");
  } catch {
    failed = true;
  }

  assertEquals(failed, true);
  assertEquals(calls, []);
});

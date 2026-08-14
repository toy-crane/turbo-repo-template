import { assertEquals } from "@std/assert";

import { handleDeleteAccount } from "./index.ts";

function createDeleteAccount(calls: string[]) {
  return (userId: string) => {
    calls.push(userId);

    return Promise.resolve();
  };
}

Deno.test("인증 정보가 없으면 관리자 삭제를 호출하지 않는다", async () => {
  const calls: string[] = [];
  const response = await handleDeleteAccount(
    new Request("http://localhost/delete-account", { method: "POST" }),
    { deleteVerifiedAccount: createDeleteAccount(calls) },
  );

  assertEquals(response.status, 401);
  assertEquals(calls, []);
});

Deno.test("POST가 아니면 관리자 삭제를 호출하지 않는다", async () => {
  const calls: string[] = [];
  const response = await handleDeleteAccount(
    new Request("http://localhost/delete-account", { method: "GET" }),
    {
      deleteVerifiedAccount: createDeleteAccount(calls),
      userClaims: { id: "verified-user" },
    },
  );

  assertEquals(response.status, 405);
  assertEquals(response.headers.get("allow"), "POST");
  assertEquals(calls, []);
});

Deno.test("본문의 사용자 ID를 무시하고 검증된 사용자만 삭제한다", async () => {
  const calls: string[] = [];
  const response = await handleDeleteAccount(
    new Request("http://localhost/delete-account", {
      body: JSON.stringify({ userId: "another-user" }),
      method: "POST",
    }),
    {
      deleteVerifiedAccount: createDeleteAccount(calls),
      userClaims: { id: "verified-user" },
    },
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { deleted: true });
  assertEquals(calls, ["verified-user"]);
});

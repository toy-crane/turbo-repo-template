import { expect, test } from "@jest/globals";
import Storage from "expo-sqlite/kv-store";

import { secureSessionStorage } from "./secure-session-storage";

const sessionKey = "sb-localhost-auth-token";
const session = JSON.stringify({
  access_token: "header.payload.signature",
  user: { id: "8f14e45f" },
});

test("저장한 session을 그대로 돌려준다", async () => {
  await secureSessionStorage.setItem(sessionKey, session);

  expect(await secureSessionStorage.getItem(sessionKey)).toBe(session);
});

test("디스크에 남는 값에는 session 내용이 보이지 않는다", async () => {
  await secureSessionStorage.setItem(sessionKey, session);

  const stored = await Storage.getItem(sessionKey);

  expect(stored).not.toBeNull();
  expect(stored).not.toContain("access_token");
  expect(stored).not.toContain("header.payload.signature");
});

test("저장된 값이 변조되면 session 대신 null을 준다", async () => {
  await secureSessionStorage.setItem(sessionKey, session);

  const stored = (await Storage.getItem(sessionKey)) ?? "";
  const [nonce, ciphertext] = stored.split(".");
  const flipped = `${ciphertext?.slice(0, -2)}00`;

  await Storage.setItem(sessionKey, `${nonce}.${flipped}`);

  expect(await secureSessionStorage.getItem(sessionKey)).toBeNull();
});

test("지우면 암호문과 키를 모두 없앤다", async () => {
  await secureSessionStorage.setItem(sessionKey, session);
  await secureSessionStorage.removeItem(sessionKey);

  expect(await Storage.getItem(sessionKey)).toBeNull();
  expect(await secureSessionStorage.getItem(sessionKey)).toBeNull();
});

test("저장한 적 없는 key는 null을 준다", async () => {
  expect(await secureSessionStorage.getItem("never-written")).toBeNull();
});

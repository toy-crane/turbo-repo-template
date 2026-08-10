import { describe, expect, test } from "@jest/globals";

import { createRawNonce, createSignInNonce, hashNonce } from "./nonce";

const HEX_64 = /^[0-9a-f]{64}$/;
// Published SHA-256 vector for "abc". If the app ever hashed with a different
// algorithm or encoding, Supabase would reject every provider sign-in.
const SHA256_OF_ABC =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("hashNonce", () => {
  test("SHA-256 hex를 만든다", async () => {
    expect(await hashNonce("abc")).toBe(SHA256_OF_ABC);
  });
});

describe("createRawNonce", () => {
  test("32바이트를 hex로 만든다", () => {
    expect(createRawNonce()).toMatch(HEX_64);
  });

  test("호출할 때마다 다른 값을 만든다", () => {
    expect(createRawNonce()).not.toBe(createRawNonce());
  });
});

describe("createSignInNonce", () => {
  test("제공자에게 줄 해시와 Supabase에 줄 원본을 짝지어 만든다", async () => {
    const nonce = await createSignInNonce();

    expect(nonce.raw).toMatch(HEX_64);
    expect(nonce.hashed).toBe(await hashNonce(nonce.raw));
    expect(nonce.hashed).not.toBe(nonce.raw);
  });

  test("로그인 시도마다 다른 nonce를 만든다", async () => {
    const first = await createSignInNonce();
    const second = await createSignInNonce();

    expect(second.raw).not.toBe(first.raw);
    expect(second.hashed).not.toBe(first.hashed);
  });
});

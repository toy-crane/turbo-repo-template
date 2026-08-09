import { beforeAll, describe, expect, test } from "bun:test";
import {
  createAnonClient,
  type LocalStack,
  readLocalStack,
  type SignedInUser,
  signInWithEmailCode,
  uniqueTestEmail,
} from "./local-supabase";

/**
 * Runs against the local stack: real Supabase Auth, real Mailpit, real Data API.
 *
 * Not part of `bun run test`. The schema workflow keeps Docker out of ordinary
 * runs, so this is `bun run test:integration` and needs `bun run db:start`
 * first.
 */

const SIGN_IN_TIMEOUT_MS = 60_000;

let stack: LocalStack;
let reader: SignedInUser;
let other: SignedInUser;

beforeAll(async () => {
  stack = await readLocalStack();
  // Two users sign in once for the whole file: each sign-in sends real mail and
  // waits for it to arrive.
  reader = await signInWithEmailCode(stack, uniqueTestEmail("reader"));
  other = await signInWithEmailCode(stack, uniqueTestEmail("other"));
}, SIGN_IN_TIMEOUT_MS * 2);

describe("이메일 코드로 가입한 사용자의 프로필", () => {
  test("가입하면 프로필 한 행이 생긴다", async () => {
    const { data, error } = await reader.client
      .from("profiles")
      .select("avatar_url, created_at, display_name, id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(reader.userId);
    // The trigger creates identity only; provider metadata never lands here.
    expect(data?.[0]?.display_name).toBeNull();
    expect(data?.[0]?.avatar_url).toBeNull();
  });

  test("자기 이름과 이미지를 수정할 수 있다", async () => {
    const { data, error } = await reader.client
      .from("profiles")
      .update({
        avatar_url: "https://example.test/reader.png",
        display_name: "Reader",
      })
      .eq("id", reader.userId)
      .select("avatar_url, display_name, updated_at")
      .single();

    expect(error).toBeNull();
    expect(data?.display_name).toBe("Reader");
    expect(data?.avatar_url).toBe("https://example.test/reader.png");
  });

  test("빈 값만 채우는 조건은 이미 저장한 값을 덮어쓰지 않는다", async () => {
    const { data } = await reader.client
      .from("profiles")
      .update({ display_name: "Overwritten" })
      .eq("id", reader.userId)
      .is("display_name", null)
      .select("display_name");

    expect(data).toEqual([]);

    const { data: current } = await reader.client
      .from("profiles")
      .select("display_name")
      .single();

    expect(current?.display_name).toBe("Reader");
  });

  test("다른 사용자의 프로필은 보이지 않는다", async () => {
    const { data, error } = await reader.client
      .from("profiles")
      .select("id")
      .eq("id", other.userId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test("다른 사용자의 프로필은 바꾸지 못한다", async () => {
    const { data } = await reader.client
      .from("profiles")
      .update({ display_name: "Hijacked" })
      .eq("id", other.userId)
      .select("id");

    expect(data).toEqual([]);

    const { data: untouched } = await other.client
      .from("profiles")
      .select("display_name")
      .single();

    expect(untouched?.display_name).toBeNull();
  });

  test("클라이언트는 프로필을 만들 수 없다", async () => {
    const { error } = await reader.client
      .from("profiles")
      .insert({ id: other.userId });

    expect(error).not.toBeNull();
  });

  test("클라이언트는 프로필을 지울 수 없다", async () => {
    const { error } = await reader.client
      .from("profiles")
      .delete()
      .eq("id", reader.userId);

    expect(error).not.toBeNull();

    const { data } = await reader.client.from("profiles").select("id");

    expect(data).toHaveLength(1);
  });

  test("로그인하지 않으면 프로필을 읽을 수 없다", async () => {
    const { data, error } = await createAnonClient(stack)
      .from("profiles")
      .select("id");

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

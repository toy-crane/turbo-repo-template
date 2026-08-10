import { beforeAll, describe, expect, test } from "bun:test";
import {
  type LocalStack,
  readLocalStack,
  type SignedInUser,
  signInWithEmailCode,
  uniqueTestEmail,
} from "./local-supabase";

/**
 * Profile onboarding against the local stack: real Supabase Auth, real Mailpit,
 * real Data API, real RLS.
 *
 * The pgTAP tests already cover the constraints as a database role. What this
 * adds is the path the app takes — a signed-in `authenticated` user going
 * through PostgREST — where a missing grant or a policy that hides the wrong
 * row shows up and a direct SQL test would not see it.
 *
 * Not part of `bun run test`. Needs `bun run db:start` first.
 */

const SIGN_IN_TIMEOUT_MS = 60_000;
/** Unique per run, so a rerun does not collide with the ids it saved last time. */
const CHOSEN_USERNAME = `owner${Date.now().toString().slice(-9)}`;

let stack: LocalStack;
let owner: SignedInUser;
let rival: SignedInUser;

beforeAll(async () => {
  stack = await readLocalStack();
  owner = await signInWithEmailCode(stack, uniqueTestEmail("owner"));
  rival = await signInWithEmailCode(stack, uniqueTestEmail("rival"));
}, SIGN_IN_TIMEOUT_MS * 2);

describe("이메일로 가입한 계정의 프로필 온보딩", () => {
  test("가입 직후에는 닉네임도 아이디도 없다", async () => {
    const { data, error } = await owner.client
      .from("profiles")
      .select("display_name, username")
      .single();

    expect(error).toBeNull();
    // This is what the app reads to decide onboarding opens rather than home.
    expect(data?.display_name).toBeNull();
    expect(data?.username).toBeNull();
  });

  test("아직 아무도 쓰지 않는 아이디는 사용할 수 있다", async () => {
    const { data, error } = await owner.client.rpc("username_status", {
      candidate: CHOSEN_USERNAME,
    });

    expect(error).toBeNull();
    expect(data).toBe("available");
  });

  test("예약한 아이디는 사용 중이 아니라 사용할 수 없다고 답한다", async () => {
    const { data } = await owner.client.rpc("username_status", {
      candidate: "admin",
    });

    expect(data).toBe("reserved");
  });

  test("형식이 틀린 아이디는 확인 단계에서 걸러진다", async () => {
    const { data } = await owner.client.rpc("username_status", {
      candidate: "Toycrane",
    });

    expect(data).toBe("invalid");
  });

  test("후보 목록에서 쓸 수 있는 값만 순서대로 돌려준다", async () => {
    const { data, error } = await owner.client.rpc("available_usernames", {
      candidates: ["admin", `${CHOSEN_USERNAME}_1`, "no", CHOSEN_USERNAME],
    });

    expect(error).toBeNull();
    expect(data).toEqual([`${CHOSEN_USERNAME}_1`, CHOSEN_USERNAME]);
  });

  test("닉네임과 아이디를 한 번에 저장하면 프로필이 완성된다", async () => {
    const { data, error } = await owner.client
      .from("profiles")
      .update({ display_name: "김민서", username: CHOSEN_USERNAME })
      .eq("id", owner.userId)
      .select("display_name, username")
      .single();

    expect(error).toBeNull();
    expect(data?.display_name).toBe("김민서");
    expect(data?.username).toBe(CHOSEN_USERNAME);
  });

  test("남이 가진 아이디는 행을 보지 못해도 사용 중으로 알려 준다", async () => {
    // RLS hides the owner's row from the rival entirely, so a plain select
    // cannot answer this. The security definer function is what can.
    const { data: rows } = await rival.client
      .from("profiles")
      .select("id")
      .eq("id", owner.userId);

    expect(rows).toEqual([]);

    const { data } = await rival.client.rpc("username_status", {
      candidate: CHOSEN_USERNAME,
    });

    expect(data).toBe("taken");
  });

  test("사용 중인 아이디는 후보 목록에서도 빠진다", async () => {
    const { data } = await rival.client.rpc("available_usernames", {
      candidates: [CHOSEN_USERNAME, `${CHOSEN_USERNAME}_2`],
    });

    expect(data).toEqual([`${CHOSEN_USERNAME}_2`]);
  });

  test("같은 아이디를 먼저 뺏기면 닉네임도 저장되지 않는다", async () => {
    const { error } = await rival.client
      .from("profiles")
      .update({ display_name: "경쟁한 닉네임", username: CHOSEN_USERNAME })
      .eq("id", rival.userId)
      .select("display_name, username")
      .single();

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23505");

    // The pair is one change or none. A nickname left behind here would give a
    // profile that is half finished with no screen able to say so.
    const { data: after } = await rival.client
      .from("profiles")
      .select("display_name, username")
      .single();

    expect(after?.display_name).toBeNull();
    expect(after?.username).toBeNull();
  });

  test("다른 아이디로는 같은 저장이 성공한다", async () => {
    const { data, error } = await rival.client
      .from("profiles")
      .update({
        display_name: "경쟁한 닉네임",
        username: `${CHOSEN_USERNAME}_2`,
      })
      .eq("id", rival.userId)
      .select("display_name, username")
      .single();

    expect(error).toBeNull();
    expect(data?.username).toBe(`${CHOSEN_USERNAME}_2`);
  });

  test("대문자가 섞인 아이디는 저장할 수 없다", async () => {
    const { error } = await rival.client
      .from("profiles")
      .update({ username: "MixedCase" })
      .eq("id", rival.userId);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });

  test("30자를 넘는 닉네임은 저장할 수 없다", async () => {
    const { error } = await rival.client
      .from("profiles")
      .update({ display_name: "가".repeat(31) })
      .eq("id", rival.userId);

    expect(error?.code).toBe("23514");
  });
});

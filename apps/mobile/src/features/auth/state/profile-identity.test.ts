import { describe, expect, test } from "@jest/globals";

import {
  buildNumberedCandidates,
  checkNickname,
  checkUsernameFormat,
  isUsernameWellFormed,
  normalizeNickname,
  normalizeUsernameInput,
  toUsernameCandidate,
} from "./profile-identity";

/** Walks a fixed list so a generated pool is the same on every run. */
function fixedRandom(values: number[]): () => number {
  let index = 0;

  return () => {
    const value = values[index % values.length] ?? 0;

    index += 1;

    return value;
  };
}

describe("normalizeNickname", () => {
  test("앞뒤 공백만 지우고 가운데 공백은 남긴다", () => {
    expect(normalizeNickname("  김 민 서  ")).toBe("김 민 서");
  });
});

describe("checkNickname", () => {
  test("공백만 있는 값은 빈 값으로 본다", () => {
    expect(checkNickname("   ")).toBe("empty");
  });

  test("30자는 통과한다", () => {
    expect(checkNickname("가".repeat(30))).toBeUndefined();
  });

  test("31자는 막는다", () => {
    expect(checkNickname("가".repeat(31))).toBe("tooLong");
  });

  test("길이는 앞뒤 공백을 뺀 뒤에 센다", () => {
    expect(checkNickname(`  ${"가".repeat(30)}  `)).toBeUndefined();
  });

  test("이모지와 공백을 쓸 수 있다", () => {
    expect(checkNickname("민서 🌊")).toBeUndefined();
  });

  // PostgreSQL length() counts code points, so the app has to as well. With
  // "".length the app would let a name through that the database then rejects.
  test("길이는 UTF-16 단위가 아니라 코드 포인트로 센다", () => {
    const emoji = "🌊";

    expect(emoji.length).toBe(2);
    expect(checkNickname(emoji.repeat(30))).toBeUndefined();
    expect(checkNickname(emoji.repeat(31))).toBe("tooLong");
  });
});

describe("normalizeUsernameInput", () => {
  test("대문자를 바로 소문자로 바꾼다", () => {
    expect(normalizeUsernameInput("MinSeo_KIM")).toBe("minseo_kim");
  });

  // Deleting as someone types would take away the character they are looking at
  // and leave no way to see what was wrong.
  test("허용하지 않는 문자는 조용히 지우지 않는다", () => {
    expect(normalizeUsernameInput("민서-Kim!")).toBe("민서-kim!");
  });
});

describe("checkUsernameFormat", () => {
  test("빈 값에는 오류를 붙이지 않는다", () => {
    expect(checkUsernameFormat("")).toBeUndefined();
  });

  test("3자 미만은 짧다고 알린다", () => {
    expect(checkUsernameFormat("ab")).toBe("tooShort");
  });

  test("20자 초과는 길다고 알린다", () => {
    expect(checkUsernameFormat("a".repeat(21))).toBe("tooLong");
  });

  test("허용하지 않는 문자를 알린다", () => {
    expect(checkUsernameFormat("toy-crane")).toBe("charset");
  });

  // Adding a third Korean character does not make 민서 usable, so the length
  // message would send the person somewhere that cannot work.
  test("짧으면서 문자도 틀리면 문자 오류를 먼저 알린다", () => {
    expect(checkUsernameFormat("민서")).toBe("charset");
  });

  test("밑줄은 처음, 끝, 연속으로도 쓸 수 있다", () => {
    expect(checkUsernameFormat("_toy__crane_")).toBeUndefined();
  });

  test("3자와 20자는 통과한다", () => {
    expect(checkUsernameFormat("abc")).toBeUndefined();
    expect(checkUsernameFormat("a".repeat(20))).toBeUndefined();
  });
});

describe("isUsernameWellFormed", () => {
  test("빈 값은 쓸 수 있는 형식이 아니다", () => {
    expect(isUsernameWellFormed("")).toBe(false);
  });

  test("형식이 맞으면 참이다", () => {
    expect(isUsernameWellFormed("toycrane")).toBe(true);
  });
});

describe("toUsernameCandidate", () => {
  test("메일 분류 문자열과 허용하지 않는 문자를 뺀다", () => {
    expect(toUsernameCandidate("toy.crane+news@example.com")).toBe("toycrane");
  });

  test("대문자를 소문자로 바꾸고 밑줄은 남긴다", () => {
    expect(toUsernameCandidate("MY_ID@example.com")).toBe("my_id");
  });

  test("붙임표를 뺀다", () => {
    expect(toUsernameCandidate("hello-world@example.com")).toBe("helloworld");
  });

  test("20자를 넘으면 뒤를 잘라낸다", () => {
    expect(toUsernameCandidate(`${"a".repeat(25)}@example.com`)).toBe(
      "a".repeat(20)
    );
  });

  test("3자보다 짧아지면 빈 값을 준다", () => {
    expect(toUsernameCandidate("a.b@example.com")).toBe("");
  });

  // Apple's private relay addresses are random and mean nothing to the person,
  // so the field gets whatever they can recognise or nothing at all.
  test("의미 없는 주소도 그대로 후보로 만들 뿐 확정하지 않는다", () => {
    expect(toUsernameCandidate("a1b2c3d4e5@privaterelay.appleid.com")).toBe(
      "a1b2c3d4e5"
    );
  });

  test("주소가 아닌 값에도 터지지 않는다", () => {
    expect(toUsernameCandidate("")).toBe("");
  });
});

describe("buildNumberedCandidates", () => {
  test("원래 후보에 숫자를 붙인다", () => {
    const candidates = buildNumberedCandidates(
      "toycrane",
      fixedRandom([0.16, 0.24, 0.06])
    );

    expect(candidates.slice(0, 3)).toEqual([
      "toycrane16",
      "toycrane24",
      "toycrane_6",
    ]);
  });

  test("서버에 물어볼 만큼 넉넉히 만든다", () => {
    const candidates = buildNumberedCandidates("toycrane");

    expect(candidates.length).toBeGreaterThanOrEqual(3);
  });

  test("모두 형식에 맞고 서로 다르다", () => {
    const candidates = buildNumberedCandidates("toycrane");

    for (const candidate of candidates) {
      expect(isUsernameWellFormed(candidate)).toBe(true);
    }

    expect(new Set(candidates).size).toBe(candidates.length);
  });

  test("20자 후보에서도 20자를 넘지 않는다", () => {
    const candidates = buildNumberedCandidates("a".repeat(20));

    expect(candidates.length).toBeGreaterThan(0);

    for (const candidate of candidates) {
      expect(candidate.length).toBeLessThanOrEqual(20);
    }
  });

  test("빈 값에서는 후보를 만들지 않는다", () => {
    expect(buildNumberedCandidates("")).toEqual([]);
  });

  test("같은 숫자만 나와도 끝난다", () => {
    const candidates = buildNumberedCandidates("toycrane", () => 0.5);

    expect(candidates).toEqual(["toycrane50", "toycrane_50"]);
  });
});

import { describe, expect, test } from "@jest/globals";

import {
  buildAvatarPath,
  decodeBase64,
  resolveAvatarUrl,
  toStoredMimeType,
} from "./avatar";

const USER_ID = "11111111-1111-4111-8111-111111111111";

/** Only the storage half of the client, which is all these functions touch. */
function fakeClient(publicUrl = "https://cdn.example.test/avatars/photo.jpg") {
  return {
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl } }) }),
    },
  } as never;
}

describe("decodeBase64", () => {
  // "Man" is the canonical example: three bytes fill exactly four base64 digits,
  // so nothing is padded and nothing is left over.
  test("네 자리가 정확히 세 바이트가 된다", () => {
    expect([...decodeBase64("TWFu")]).toEqual([77, 97, 110]);
  });

  // One and two bytes are the cases padding exists for. Getting these wrong adds
  // a trailing zero byte, which a JPEG decoder notices and a unit test rarely does.
  test("패딩이 붙은 길이도 원래 바이트 수로 돌아온다", () => {
    expect([...decodeBase64("TWE=")]).toEqual([77, 97]);
    expect([...decodeBase64("TQ==")]).toEqual([77]);
  });

  test("값이 비어 있으면 바이트도 없다", () => {
    expect(decodeBase64("")).toHaveLength(0);
  });

  // Some pickers wrap long base64 in newlines. Dropping anything outside the
  // alphabet is what keeps that from shifting every byte after the first break.
  test("알파벳 밖의 문자는 건너뛴다", () => {
    expect([...decodeBase64("TWFu\n")]).toEqual([77, 97, 110]);
  });

  // The whole byte range in one pass: 0xFB 0xFF 0xFE has the high bit set in
  // every byte, which is where a signed shift would show up.
  test("높은 비트가 선 바이트도 그대로 돌아온다", () => {
    expect([...decodeBase64("+//+")]).toEqual([251, 255, 254]);
  });
});

describe("buildAvatarPath", () => {
  test("자기 폴더 아래에 저장한다", () => {
    expect(buildAvatarPath(USER_ID, "image/jpeg", "abcd")).toBe(
      `${USER_ID}/abcd.jpg`
    );
  });

  test("파일 형식에 맞는 확장자를 붙인다", () => {
    expect(buildAvatarPath(USER_ID, "image/png", "abcd")).toBe(
      `${USER_ID}/abcd.png`
    );
  });

  // An unknown type still has to produce a path the constraint accepts, because
  // the alternative is a save that fails after the person already chose a photo.
  test("모르는 형식은 기본 확장자로 저장한다", () => {
    expect(buildAvatarPath(USER_ID, "image/heic", "abcd")).toBe(
      `${USER_ID}/abcd.jpg`
    );
  });
});

describe("toStoredMimeType", () => {
  test("버킷이 받는 형식은 그대로 둔다", () => {
    expect(toStoredMimeType("image/png")).toBe("image/png");
  });

  // The name and the declared type have to agree. Naming the file .jpg while
  // still declaring image/heic uploads something the bucket refuses, and the
  // person is told the whole profile failed to save.
  test("모르는 형식은 확장자와 같은 기본 형식으로 맞춘다", () => {
    expect(toStoredMimeType("image/heic")).toBe("image/jpeg");
  });
});

describe("resolveAvatarUrl", () => {
  test("직접 고른 사진이 제공자 사진보다 앞선다", () => {
    expect(
      resolveAvatarUrl(fakeClient(), {
        avatarPath: `${USER_ID}/abcd.jpg`,
        avatarUrl: "https://provider.example.test/photo.jpg",
      })
    ).toBe("https://cdn.example.test/avatars/photo.jpg");
  });

  test("고른 사진이 없으면 제공자 사진을 쓴다", () => {
    expect(
      resolveAvatarUrl(fakeClient(), {
        avatarPath: null,
        avatarUrl: "https://provider.example.test/photo.jpg",
      })
    ).toBe("https://provider.example.test/photo.jpg");
  });

  // Both empty is the deleted-photo state, and it has to come back as nothing so
  // the avatar falls through to the nickname's first letter.
  test("둘 다 없으면 사진이 없다고 답한다", () => {
    expect(
      resolveAvatarUrl(fakeClient(), { avatarPath: null, avatarUrl: null })
    ).toBeNull();
  });
});

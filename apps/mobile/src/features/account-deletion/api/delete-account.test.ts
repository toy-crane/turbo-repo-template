import { expect, jest, test } from "@jest/globals";

import { deleteAccount } from "./delete-account";

test("현재 세션으로 계정 삭제 함수를 호출하고 사용자 id는 보내지 않는다", async () => {
  const invoke = jest.fn(() =>
    Promise.resolve({ data: { deleted: true }, error: null })
  );

  await deleteAccount({ functions: { invoke } } as never);

  expect(invoke).toHaveBeenCalledWith("delete-account");
});

test("계정 삭제 함수의 실패를 호출한 화면에 돌려준다", async () => {
  const failure = new Error("Network request failed");
  const invoke = jest.fn(() => Promise.resolve({ data: null, error: failure }));

  await expect(deleteAccount({ functions: { invoke } } as never)).rejects.toBe(
    failure
  );
});

import { describe, expect, test } from "@jest/globals";

import { plainLine } from "./plain-line";

describe("plainLine", () => {
  test("여러 줄을 한 줄로 붙인다", () => {
    expect(plainLine("첫 줄\n\n둘째 줄")).toBe("첫 줄 둘째 줄");
  });

  test("제목, 인용, 목록 기호를 없앤다", () => {
    expect(plainLine("## 제목\n> 인용\n- 첫 항목\n1. 다음 항목")).toBe(
      "제목 인용 첫 항목 다음 항목"
    );
  });

  test("강조와 인라인 코드 기호를 없애고 안의 말은 남긴다", () => {
    expect(plainLine("**굵게** 와 *기울임* 과 `코드` 와 ~~취소~~")).toBe(
      "굵게 와 기울임 과 코드 와 취소"
    );
    expect(plainLine("_밑줄 강조_ 도 마찬가지입니다")).toBe(
      "밑줄 강조 도 마찬가지입니다"
    );
  });

  // GFM does not read a word running through underscores as emphasis, and an
  // answer about `snake_case_name` is exactly what a side chat gets opened on.
  test("말 안을 지나는 밑줄은 강조로 보지 않는다", () => {
    expect(plainLine("snake_case_name 을 씁니다")).toBe(
      "snake_case_name 을 씁니다"
    );
    expect(plainLine("`created_at`과 `updated_at`")).toBe(
      "created_at과 updated_at"
    );
  });

  test("코드 블록은 통째로 뺀다", () => {
    expect(plainLine("설명\n\n```sql\nselect 1;\n```\n\n마무리")).toBe(
      "설명 마무리"
    );
  });

  test("링크와 이미지는 보이는 말만 남긴다", () => {
    expect(plainLine("[문서](https://example.com)를 보세요")).toBe(
      "문서를 보세요"
    );
    expect(plainLine("![그림](https://example.com/a.png)")).toBe("그림");
  });

  // Single marks are left alone on purpose: an answer worth opening a side
  // chat about is often exactly the one full of identifiers and arrows.
  test("짝이 아닌 기호는 말 안에 그대로 둔다", () => {
    expect(plainLine("`auth.uid() = owner_id` 조건")).toBe(
      "auth.uid() = owner_id 조건"
    );
    expect(plainLine("값이 5 * 3 이고 a => b 입니다")).toBe(
      "값이 5 * 3 이고 a => b 입니다"
    );
  });

  test("빈 답변은 빈 줄로 둔다", () => {
    expect(plainLine("   \n\n  ")).toBe("");
  });
});

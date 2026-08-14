import { describe, expect, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { UserAvatar } from "./user-avatar";

const AVATAR_URL = "https://example.test/avatar.png";

describe("UserAvatar", () => {
  test("사진이 없으면 이름의 첫 글자를 대문자로 보여준다", async () => {
    await renderWithHeroUI(
      <UserAvatar avatarUrl={null} displayName="toy crane" testID="avatar" />
    );

    expect(screen.getByText("T")).toBeOnTheScreen();
    expect(screen.getByTestId("avatar").props.className).not.toContain(
      "bg-transparent"
    );
  });

  test("사진이 있으면 글자 대신 사진을 그린다", async () => {
    await renderWithHeroUI(
      <UserAvatar
        avatarUrl={AVATAR_URL}
        displayName="Toy Crane"
        testID="avatar"
      />
    );

    expect(screen.getByLabelText("Toy Crane 프로필 사진").props.source).toEqual(
      {
        uri: AVATAR_URL,
      }
    );
    expect(screen.getByTestId("avatar").props.className).toContain(
      "bg-transparent"
    );
    expect(screen.queryByText("T")).not.toBeOnTheScreen();
  });

  test("이름도 사진도 없으면 사람 아이콘으로 남는다", async () => {
    await renderWithHeroUI(<UserAvatar avatarUrl={null} displayName={null} />);

    expect(screen.getByLabelText("프로필 사진")).toBeOnTheScreen();
  });

  test("이름 앞뒤 공백은 첫 글자로 세지 않는다", async () => {
    await renderWithHeroUI(
      <UserAvatar avatarUrl={null} displayName="  루비  " />
    );

    expect(screen.getByText("루")).toBeOnTheScreen();
  });
});

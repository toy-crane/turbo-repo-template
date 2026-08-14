import { describe, expect, test } from "@jest/globals";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

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

  test("투명 사진 표현을 선택하면 불러온 사진 뒤에 바탕을 더하지 않는다", async () => {
    await renderWithHeroUI(
      <UserAvatar
        avatarUrl={AVATAR_URL}
        displayName="Toy Crane"
        testID="avatar"
        transparentPhotoBackground
      />
    );

    const image = screen.getByLabelText("Toy Crane 프로필 사진");

    expect(image.props.source).toEqual({ uri: AVATAR_URL });
    fireEvent(image, "load", { nativeEvent: {} });
    await waitFor(() => {
      expect(screen.getByTestId("avatar").props.className).toContain(
        "bg-transparent"
      );
    });
    expect(screen.queryByText("T")).not.toBeOnTheScreen();
  });

  test("투명 사진을 불러오지 못하면 이니셜 원형 바탕으로 돌아간다", async () => {
    await renderWithHeroUI(
      <UserAvatar
        avatarUrl={AVATAR_URL}
        displayName="Toy Crane"
        testID="avatar"
        transparentPhotoBackground
      />
    );

    const image = screen.getByLabelText("Toy Crane 프로필 사진");

    fireEvent(image, "load", { nativeEvent: {} });
    await waitFor(() => {
      expect(screen.getByTestId("avatar").props.className).toContain(
        "bg-transparent"
      );
    });

    fireEvent(screen.getByLabelText("Toy Crane 프로필 사진"), "error", {
      nativeEvent: { error: "failed" },
    });

    await waitFor(() => {
      expect(screen.getByText("T")).toBeOnTheScreen();
      expect(screen.getByTestId("avatar").props.className).not.toContain(
        "bg-transparent"
      );
    });
  });

  test("Settings 밖의 사진 아바타는 기존 바탕 표현을 유지한다", async () => {
    await renderWithHeroUI(
      <UserAvatar
        avatarUrl={AVATAR_URL}
        displayName="Toy Crane"
        testID="avatar"
      />
    );

    fireEvent(screen.getByLabelText("Toy Crane 프로필 사진"), "load", {
      nativeEvent: {},
    });

    await waitFor(() => {
      expect(screen.getByTestId("avatar").props.className).not.toContain(
        "bg-transparent"
      );
    });
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

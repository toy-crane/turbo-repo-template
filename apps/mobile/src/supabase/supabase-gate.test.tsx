import { expect, jest, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { SupabaseGate } from "./supabase-gate";

const missingUrlVariable = /EXPO_PUBLIC_SUPABASE_URL/;

jest.mock("./client", () => ({
  getSupabaseClient: () => {
    throw new Error(
      "Supabase client is not configured. Set EXPO_PUBLIC_SUPABASE_URL in apps/mobile/.env.local."
    );
  },
}));

test("설정이 없으면 앱을 죽이지 않고 원인을 화면에 보여준다", async () => {
  await render(
    <SupabaseGate>
      <Text>app content</Text>
    </SupabaseGate>
  );

  expect(screen.getByText(missingUrlVariable)).toBeOnTheScreen();
  expect(screen.queryByText("app content")).toBeNull();
});

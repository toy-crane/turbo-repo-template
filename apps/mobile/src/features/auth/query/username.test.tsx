import { beforeEach, expect, jest, test } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  readAvailableUsernames,
  readUsernameStatus,
} from "@/features/auth/api/profile";
import { useUsernameStatus, useUsernameSuggestions } from "./username";

jest.mock("@/features/auth/api/profile", () => ({
  readAvailableUsernames: jest.fn(),
  readUsernameStatus: jest.fn(),
}));

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: jest.fn(() => ({})),
}));

const mockReadUsernameStatus = jest.mocked(readUsernameStatus);
const mockReadAvailableUsernames = jest.mocked(readAvailableUsernames);

beforeEach(() => {
  jest.clearAllMocks();
  mockReadAvailableUsernames.mockResolvedValue([
    "toycrane1",
    "toycrane2",
    "toycrane3",
  ]);
  mockReadUsernameStatus.mockResolvedValue("available");
});

test("사용자 이름은 전역 신선도와 관계없이 화면에 다시 들어오면 재조회한다", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const first = await renderHook(() => useUsernameStatus("toycrane", true), {
    wrapper,
  });

  await waitFor(() => {
    expect(first.result.current.data).toBe("available");
  });
  await first.unmount();

  const second = await renderHook(() => useUsernameStatus("toycrane", true), {
    wrapper,
  });

  await waitFor(() => {
    expect(mockReadUsernameStatus).toHaveBeenCalledTimes(2);
  });
  await second.unmount();
  client.clear();
});

test("사용자 이름 제안도 화면에 다시 들어오면 재조회한다", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const first = await renderHook(
    () => useUsernameSuggestions("toycrane", true),
    { wrapper }
  );

  await waitFor(() => {
    expect(first.result.current.data).toHaveLength(3);
  });
  await first.unmount();

  const second = await renderHook(
    () => useUsernameSuggestions("toycrane", true),
    { wrapper }
  );

  await waitFor(() => {
    expect(mockReadAvailableUsernames).toHaveBeenCalledTimes(2);
  });
  await second.unmount();
  client.clear();
});

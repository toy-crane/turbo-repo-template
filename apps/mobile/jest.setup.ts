import { jest } from "@jest/globals";

// Placeholder public values. The Supabase singleton reads these at import time,
// so every test that mounts the root layout needs them set. Real values live in
// the developer's untracked apps/mobile/.env.local.
process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";

Object.defineProperty(globalThis, "__DEV__", {
  configurable: true,
  value: false,
  writable: true,
});

// Native modules the encrypted session storage needs. Jest has no SQLite
// database and no keystore, so back both with memory and give the cipher a
// deterministic-length random source.
jest.mock("expo-sqlite/kv-store", () => {
  const entries = new Map<string, string>();

  return {
    __esModule: true,
    default: {
      getItem: (key: string) => Promise.resolve(entries.get(key) ?? null),
      removeItem: (key: string) => {
        entries.delete(key);

        return Promise.resolve();
      },
      setItem: (key: string, value: string) => {
        entries.set(key, value);

        return Promise.resolve();
      },
    },
  };
});

jest.mock("expo-secure-store", () => {
  const entries = new Map<string, string>();

  return {
    deleteItemAsync: (key: string) => {
      entries.delete(key);

      return Promise.resolve();
    },
    getItemAsync: (key: string) => Promise.resolve(entries.get(key) ?? null),
    setItemAsync: (key: string, value: string) => {
      entries.set(key, value);

      return Promise.resolve();
    },
  };
});

jest.mock("expo-crypto", () => ({
  getRandomBytes: (length: number) =>
    Uint8Array.from({ length }, (_unused, index) => (index * 7 + 13) % 256),
}));

jest.mock("react-native-worklets", () =>
  require("react-native-worklets/src/mock")
);

jest.mock("react-native-reanimated", () => ({
  ...require("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

const reanimated = require("react-native-reanimated");
reanimated.setUpTests();

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

// Expo SQLite has no native database under Jest, so back the `localStorage`
// polyfill with memory. Supabase auth reads it while the client is constructed.
jest.mock("expo-sqlite/localStorage/install", () => {
  const entries = new Map<string, string>();

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      clear: () => entries.clear(),
      getItem: (key: string) => entries.get(key) ?? null,
      key: (index: number) => Array.from(entries.keys())[index] ?? null,
      get length() {
        return entries.size;
      },
      removeItem: (key: string) => {
        entries.delete(key);
      },
      setItem: (key: string, value: string) => {
        entries.set(key, value);
      },
    },
    writable: true,
  });

  return {};
});

jest.mock("react-native-worklets", () =>
  require("react-native-worklets/src/mock")
);

jest.mock("react-native-reanimated", () => ({
  ...require("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

const reanimated = require("react-native-reanimated");
reanimated.setUpTests();

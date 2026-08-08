import { jest } from "@jest/globals";

Object.defineProperty(globalThis, "__DEV__", {
  configurable: true,
  value: false,
  writable: true,
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

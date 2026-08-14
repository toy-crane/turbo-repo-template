import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** @type {import("jest").Config} */
const config = {
  moduleNameMapper: {
    "\\.css$": "<rootDir>/src/shared/test/style-mock.ts",
    // The same prefix tsconfig.json declares for Metro. Jest resolves modules
    // on its own, so a test that mocks "@/..." needs this to find the file.
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@env$": "<rootDir>/env.ts",
    "^lucide-react-native/icons/(.*)$":
      "<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js",
  },
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Named here rather than left to jest-expo, which would otherwise pick up
  // babel.config.js. That file exists for Metro: it turns on Worklets Bundle
  // Mode, which rewrites every worklet into a generated module only Metro's
  // resolver can find, so under Jest a worklet would load nothing. This is the
  // preset jest-expo reaches for when an app has no Babel config of its own.
  transform: {
    "\\.[jt]sx?$": [
      "babel-jest",
      {
        babelrc: false,
        configFile: false,
        presets: [require.resolve("expo/internal/babel-preset")],
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(.bun|@noble/.*|@t3-oss/.*|ai/.*|@ai-sdk/.*|@workflow/.*|swr|throttleit|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|heroui-native|lucide-react-native|uniwind|tailwind-merge|tailwind-variants|react-navigation|@react-navigation/.*|standard-navigation|@sentry/react-native|native-base|react-native-svg|react-native-nitro-google-signin|react-native-nitro-modules))",
  ],
};

export default config;

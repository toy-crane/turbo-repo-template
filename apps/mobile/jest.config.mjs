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
  transformIgnorePatterns: [
    "node_modules/(?!(.bun|@noble/.*|@t3-oss/.*|ai/.*|@ai-sdk/.*|@workflow/.*|swr|throttleit|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|heroui-native|lucide-react-native|uniwind|tailwind-merge|tailwind-variants|react-navigation|@react-navigation/.*|standard-navigation|@sentry/react-native|native-base|react-native-svg|react-native-nitro-google-signin|react-native-nitro-modules))",
  ],
};

export default config;

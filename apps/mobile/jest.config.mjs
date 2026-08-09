/** @type {import("jest").Config} */
const config = {
  moduleNameMapper: {
    "\\.css$": "<rootDir>/src/test/style-mock.ts",
  },
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(.bun|@noble/.*|@t3-oss/.*|ai/.*|@ai-sdk/.*|@workflow/.*|swr|throttleit|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|heroui-native|uniwind|tailwind-merge|tailwind-variants|react-navigation|@react-navigation/.*|standard-navigation|@sentry/react-native|native-base|react-native-svg|react-native-nitro-google-signin|react-native-nitro-modules))",
  ],
};

export default config;

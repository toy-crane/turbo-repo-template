/** @type {import("jest").Config} */
const config = {
  moduleNameMapper: {
    "\\.css$": "<rootDir>/src/test/style-mock.ts",
  },
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(.bun|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|heroui-native|uniwind|tailwind-merge|tailwind-variants|react-navigation|@react-navigation/.*|standard-navigation|@sentry/react-native|native-base|react-native-svg))",
  ],
};

export default config;

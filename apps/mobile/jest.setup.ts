import { jest } from "@jest/globals";

import { applyTestTheme } from "@/shared/test/theme";

/** The props the app passes to a provider's own native sign-in button. */
interface ProviderButtonProps {
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
}

// Before any screen renders, and for every test file rather than only the ones
// using `renderWithHeroUI`: a screen drawn by `renderRouter` reads the same
// semantic colours and has no other place to get them.
applyTestTheme();

// Placeholder public values. Tests use the same complete contract as the app
// without reading the developer's untracked apps/mobile/.env.local.
process.env.EXPO_PUBLIC_API_URL = "http://127.0.0.1:3900";
process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID =
  "123456789-ios.apps.googleusercontent.com";
process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
  "123456789-web.apps.googleusercontent.com";
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

// Real SHA-256 from Node rather than a stub: the nonce contract is that the
// provider receives the hash of what Supabase receives, and a fake digest would
// let a wrong pairing pass. The byte source stays deterministic but advances on
// every call, so two sign-in attempts in one test get different nonces.
jest.mock("expo-crypto", () => {
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  let seed = 0;

  return {
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    CryptoEncoding: { BASE64: "base64", HEX: "hex" },
    // Both arguments are honoured on purpose. A stand-in that always answered
    // SHA-256 hex would let the app switch algorithm or encoding without a
    // single test noticing, and Supabase compares against SHA-256 hex.
    digestStringAsync: (
      algorithm: string,
      data: string,
      options?: { encoding?: string }
    ) =>
      Promise.resolve(
        createHash(algorithm.replace("-", "").toLowerCase())
          .update(data)
          .digest(options?.encoding === "base64" ? "base64" : "hex")
      ),
    getRandomBytes: (length: number) => {
      seed += 1;

      return Uint8Array.from(
        { length },
        (_unused, index) => (index * 7 + 13 * seed) % 256
      );
    },
  };
});

// Both provider SDKs reach for native modules while their module body runs, so
// they cannot be imported at all under Jest. These stand-ins keep the shape the
// app uses; each test drives them through jest.mocked().
jest.mock("expo-apple-authentication", () => {
  const React = require("react") as typeof import("react");
  const { Pressable } =
    require("react-native") as typeof import("react-native");

  return {
    AppleAuthenticationButton: (props: ProviderButtonProps) =>
      React.createElement(Pressable, {
        accessibilityLabel: props.accessibilityLabel,
        accessibilityRole: "button",
        onPress: props.onPress,
        testID: props.testID,
      }),
    AppleAuthenticationButtonStyle: { BLACK: 2, WHITE: 0, WHITE_OUTLINE: 1 },
    AppleAuthenticationButtonType: { CONTINUE: 1, SIGN_IN: 0, SIGN_UP: 2 },
    AppleAuthenticationScope: { EMAIL: 1, FULL_NAME: 0 },
    isAvailableAsync: jest.fn(() => Promise.resolve(true)),
    signInAsync: jest.fn(() =>
      Promise.reject(new Error("signInAsync is not stubbed for this test"))
    ),
  };
});

jest.mock("react-native-nitro-google-signin", () => {
  const React = require("react") as typeof import("react");
  const { Pressable } =
    require("react-native") as typeof import("react-native");
  const notStubbed = () =>
    Promise.reject(new Error("Google sign-in is not stubbed for this test"));

  return {
    GoogleOneTapSignIn: {
      checkPlayServices: jest.fn(() => Promise.resolve()),
      configure: jest.fn(),
      createAccount: jest.fn(notStubbed),
      presentExplicitSignIn: jest.fn(notStubbed),
      signIn: jest.fn(notStubbed),
      signOut: jest.fn(() => Promise.resolve()),
    },
    GoogleSignInButton: (props: ProviderButtonProps) =>
      React.createElement(Pressable, {
        accessibilityLabel: props.accessibilityLabel,
        accessibilityRole: "button",
        disabled: props.disabled,
        onPress: props.onPress,
        testID: props.testID,
      }),
    isCancelledResponse: (response: { type?: string }) =>
      response.type === "cancelled",
    isNoSavedCredentialFoundResponse: (response: { type?: string }) =>
      response.type === "noSavedCredentialFound",
    isSuccessResponse: (response: { type?: string }) =>
      response.type === "success",
    statusCodes: {
      IN_PROGRESS: "IN_PROGRESS",
      PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
      SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
      SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
    },
  };
});

// The Markdown renderer is a Fabric view, so it draws nothing under Jest. Start
// with the package's own mock, then keep every text-renderer prop on the stand-in
// because the chat tests verify the app's wiring at that native boundary. Real
// Markdown layout and streaming behaviour belong to device checks.
jest.mock("react-native-enriched-markdown", () => {
  const React = require("react") as typeof import("react");
  const { Text } = require("react-native") as typeof import("react-native");
  const enrichedMarkdownMock = require("react-native-enriched-markdown/jest");

  return {
    ...enrichedMarkdownMock,
    // Every prop stays on the element, `markdown` included: the tests read the
    // Markdown and the rendering options from there.
    EnrichedMarkdownText: (
      props: { markdown: string } & Record<string, unknown>
    ) =>
      React.createElement(
        Text,
        props as React.ComponentProps<typeof Text>,
        props.markdown
      ),
  };
});

// The library ships its own stand-in for the native side, which is what lets a
// screen using KeyboardStickyView render without a device keyboard.
jest.mock("react-native-keyboard-controller", () =>
  require("react-native-keyboard-controller/jest")
);

jest.mock("react-native-worklets", () =>
  require("react-native-worklets/src/mock")
);

// Motion is allowed by default. A screen that draws something moving has to
// be seen both ways, so the answer is read from a switch a test can flip
// rather than fixed here; see src/shared/test/reduced-motion.ts.
jest.mock("react-native-reanimated", () => ({
  ...require("react-native-reanimated/mock"),
  useReducedMotion: () =>
    (
      require("@/shared/test/reduced-motion") as typeof import("@/shared/test/reduced-motion")
    ).mockReducedMotion.isOn,
}));

const reanimated = require("react-native-reanimated");
reanimated.setUpTests();

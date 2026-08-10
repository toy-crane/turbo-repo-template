import { Platform } from "react-native";
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  type OneTapResponse,
} from "react-native-nitro-google-signin";
import {
  GOOGLE_IOS_CLIENT_ID_ENV,
  GOOGLE_WEB_CLIENT_ID_ENV,
  resolveGoogleEnv,
} from "@/features/auth/config/google-env";
import {
  AuthConfigurationError,
  MissingProviderTokenError,
  NoProviderCredentialError,
} from "./auth-errors";
import { createSignInNonce } from "./nonce";
import type { ProviderSignInResult } from "./provider-sign-in";

function configurationError(variable: string): AuthConfigurationError {
  return new AuthConfigurationError(
    `Google 로그인 설정이 없습니다. apps/mobile/.env.local에 ${variable}을 넣고 앱을 다시 빌드하세요. README.md "Google 로그인 준비"를 참고하세요.`
  );
}

/**
 * Android reaches Google through Credential Manager. Each step opens a wider
 * account list than the one before, and every one of them only runs because the
 * person pressed the button — nothing here signs anyone in on its own.
 */
async function signInOnAndroid(): Promise<OneTapResponse> {
  await GoogleOneTapSignIn.checkPlayServices();

  const authorized = await GoogleOneTapSignIn.signIn();

  if (isSuccessResponse(authorized) || isCancelledResponse(authorized)) {
    return authorized;
  }

  const anyAccount = await GoogleOneTapSignIn.createAccount();

  if (isSuccessResponse(anyAccount) || isCancelledResponse(anyAccount)) {
    return anyAccount;
  }

  return await GoogleOneTapSignIn.presentExplicitSignIn();
}

/**
 * Runs Google's own account UI and returns what Supabase needs.
 *
 * Returns undefined when the person closed the sheet. That is not a failure and
 * the screen shows nothing for it.
 *
 * iOS goes straight to the explicit picker. `signIn()` there restores whoever
 * used the app last, which would turn "sign in" into "silently become the
 * previous user" — including right after someone signed out.
 */
export async function signInWithGoogle(): Promise<
  ProviderSignInResult | undefined
> {
  const { iosClientId, webClientId } = resolveGoogleEnv();

  // The Web client id is what the ID token is issued for on both platforms, so
  // it is required even though no browser is involved.
  if (!webClientId) {
    throw configurationError(GOOGLE_WEB_CLIENT_ID_ENV);
  }

  if (Platform.OS === "ios" && !iosClientId) {
    throw configurationError(GOOGLE_IOS_CLIENT_ID_ENV);
  }

  const nonce = await createSignInNonce();

  // configure() carries the nonce, so it runs again for every attempt. Only
  // basic identity is requested: no extra scopes, no offline access, no
  // serverAuthCode.
  GoogleOneTapSignIn.configure({
    iosClientId,
    nonce: nonce.hashed,
    webClientId,
  });

  const response =
    Platform.OS === "ios"
      ? await GoogleOneTapSignIn.presentExplicitSignIn()
      : await signInOnAndroid();

  // Three outcomes, not two. Closing the sheet is a decision and stays silent,
  // but "the SDK found no credential" is a dead end the person has to hear
  // about — treating it as a cancellation makes the button look broken.
  if (isCancelledResponse(response)) {
    return;
  }

  if (!isSuccessResponse(response)) {
    throw new NoProviderCredentialError(
      isNoSavedCredentialFoundResponse(response)
        ? "Google SDK found no saved credential."
        : `Google SDK returned an unexpected response: ${response.type}.`
    );
  }

  const { idToken, user } = response.data;

  if (!idToken) {
    throw new MissingProviderTokenError();
  }

  return {
    identity: { avatarUrl: user.photo ?? null, displayName: user.name ?? null },
    idToken,
    rawNonce: nonce.raw,
  };
}

/**
 * Ends the Google session on this device so the next sign-in asks which account
 * to use. Not `revokeAccess`: signing out of the app should not withdraw the
 * consent the person already gave.
 */
export function signOutOfGoogle(): Promise<void> {
  return GoogleOneTapSignIn.signOut();
}

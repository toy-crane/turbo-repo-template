import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from "expo-apple-authentication";
import Constants from "expo-constants";
import { Button } from "heroui-native/button";
import { Description } from "heroui-native/description";
import { Input } from "heroui-native/input";
import { InputOTP, REGEXP_ONLY_DIGITS } from "heroui-native/input-otp";
import { Label } from "heroui-native/label";
import { Separator } from "heroui-native/separator";
import { Spinner } from "heroui-native/spinner";
import { TextField } from "heroui-native/text-field";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, Text, useColorScheme, View } from "react-native";
import { GoogleSignInButton } from "react-native-nitro-google-signin";

import { getSupabaseClient } from "../../supabase/client";
import { signInWithApple } from "./apple-sign-in";
import { type AuthFailure, classifyAuthError } from "./auth-errors";
import {
  describeCodeSent,
  formatResendLabel,
  isCompleteCode,
  isValidEmail,
  normalizeEmail,
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  sendEmailCode,
  toCodeDigits,
  verifyEmailCode,
} from "./email-otp";
import { signInWithGoogle } from "./google-sign-in";
import {
  completeProviderSignIn,
  type ProviderSignInResult,
} from "./provider-sign-in";

const SECOND_MS = 1000;
const APPLE_BUTTON_HEIGHT = 48;
const GOOGLE_BUTTON_HEIGHT = 48;

const appleButtonStyle = {
  height: APPLE_BUTTON_HEIGHT,
  width: "100%",
} as const;
const googleButtonStyle = {
  height: GOOGLE_BUTTON_HEIGHT,
  width: "100%",
} as const;

/** Accessibility names double as the contract for tests and agent-device. */
export const signInLabels = {
  apple: "Apple로 계속하기",
  changeEmail: "다른 이메일 사용",
  code: "인증 코드",
  email: "이메일",
  google: "Google로 계속하기",
  resend: "코드 다시 받기",
  submitEmail: "이메일로 계속하기",
  verify: "코드 확인",
} as const;

/** Which control the person is waiting on. Also what blocks a second run. */
type PendingAction = "apple" | "code" | "email" | "google" | "resend";

/** Where the message belongs, so it appears next to what caused it. */
type FailureScope = "code" | "email" | "provider";

interface ScopedFailure extends AuthFailure {
  scope: FailureScope;
}

function renderSlots({ slots }: { slots: { index: number }[] }) {
  return slots.map((slot) => (
    <InputOTP.Slot index={slot.index} key={slot.index} />
  ));
}

function FailureMessage({
  failure,
  scope,
}: {
  failure: ScopedFailure | undefined;
  scope: FailureScope;
}) {
  if (!failure || failure.scope !== scope) {
    return null;
  }

  return (
    <Text
      accessibilityRole="alert"
      className="text-danger text-sm"
      testID={`sign-in-error-${scope}`}
    >
      {failure.message}
    </Text>
  );
}

export function SignInScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isCodeStep, setIsCodeStep] = useState(false);
  const [pending, setPending] = useState<PendingAction | undefined>();
  const [failure, setFailure] = useState<ScopedFailure | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const colorScheme = useColorScheme();
  const appName = Constants.expoConfig?.name ?? "앱";
  const isBusy = pending !== undefined;
  const running = useRef<PendingAction | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stopCountdown = useCallback(() => {
    if (timer.current !== undefined) {
      clearInterval(timer.current);
      timer.current = undefined;
    }
  }, []);

  useEffect(() => stopCountdown, [stopCountdown]);

  const startCountdown = useCallback(() => {
    stopCountdown();
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    timer.current = setInterval(() => {
      setSecondsLeft((remaining) => {
        if (remaining <= 1) {
          stopCountdown();

          return 0;
        }

        return remaining - 1;
      });
    }, SECOND_MS);
  }, [stopCountdown]);

  /**
   * One entry point for every action on this screen. It is what keeps a second
   * press from starting a second attempt, and what guarantees the control comes
   * out of its pending state on every path, including the ones that throw.
   */
  const run = useCallback(
    async (
      action: PendingAction,
      scope: FailureScope,
      work: () => Promise<void>
    ) => {
      // The ref, not the state, is what stops a double tap. Two presses in the
      // same frame both read the state from before the first one, so a state
      // check would let the second through and start a second sign-in.
      if (running.current !== undefined) {
        return;
      }

      running.current = action;
      setPending(action);
      setFailure(undefined);

      try {
        await work();
      } catch (error) {
        const classified = classifyAuthError(error);

        // Closing a provider sheet is a decision, not a failure. Saying
        // something went wrong would be both untrue and alarming.
        if (classified.kind !== "cancelled") {
          setFailure({ ...classified, scope });
        }
      } finally {
        running.current = undefined;
        setPending(undefined);
      }
    },
    []
  );

  const signInWithProvider = useCallback(
    (
      action: "apple" | "google",
      start: () => Promise<ProviderSignInResult | undefined>
    ) =>
      run(action, "provider", async () => {
        const result = await start();

        // Undefined means the person closed the provider's sheet.
        if (result) {
          await completeProviderSignIn(getSupabaseClient(), action, result);
        }
      }),
    [run]
  );

  const requestCode = useCallback(
    (action: "email" | "resend") => {
      const address = normalizeEmail(email);

      if (!isValidEmail(address)) {
        setFailure({
          kind: "invalidEmail",
          message: "이메일 주소를 다시 확인해 주세요.",
          scope: "email",
        });

        return;
      }

      return run(action, action === "resend" ? "code" : "email", async () => {
        await sendEmailCode(getSupabaseClient(), address);
        setEmail(address);
        setCode("");
        setIsCodeStep(true);
        startCountdown();
      });
    },
    [email, run, startCountdown]
  );

  const verifyCode = useCallback(
    (value: string) => {
      if (!isCompleteCode(value)) {
        return;
      }

      return run("code", "code", () =>
        verifyEmailCode(getSupabaseClient(), normalizeEmail(email), value)
      );
    },
    [email, run]
  );

  const changeCode = useCallback((value: string) => {
    setCode(toCodeDigits(value));
  }, []);

  const confirmCode = useCallback(() => verifyCode(code), [code, verifyCode]);

  const submitEmail = useCallback(() => requestCode("email"), [requestCode]);

  const resendCode = useCallback(() => requestCode("resend"), [requestCode]);

  const startGoogle = useCallback(
    () => signInWithProvider("google", signInWithGoogle),
    [signInWithProvider]
  );

  const startApple = useCallback(
    () => signInWithProvider("apple", signInWithApple),
    [signInWithProvider]
  );

  const editEmail = useCallback(() => {
    stopCountdown();
    setSecondsLeft(0);
    setIsCodeStep(false);
    setCode("");
    setFailure(undefined);
  }, [stopCountdown]);

  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-5 px-6 pt-10 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2">
        <Text className="font-semibold text-2xl text-foreground">
          {appName}
        </Text>
        <Text className="text-base text-muted-foreground">
          {isCodeStep
            ? describeCodeSent(email)
            : "계정으로 로그인하면 저장한 내용을 어느 기기에서나 볼 수 있습니다."}
        </Text>
      </View>

      {isCodeStep ? (
        <View className="gap-4">
          <View className="gap-2">
            <Label>인증 코드</Label>
            <InputOTP
              isDisabled={isBusy}
              maxLength={OTP_LENGTH}
              onChange={changeCode}
              onComplete={verifyCode}
              pattern={REGEXP_ONLY_DIGITS}
              textInputProps={{
                accessibilityLabel: signInLabels.code,
                autoComplete: "one-time-code",
                testID: "sign-in-code",
              }}
              value={code}
            >
              <InputOTP.Group>{renderSlots}</InputOTP.Group>
            </InputOTP>
            <FailureMessage failure={failure} scope="code" />
          </View>

          <Button
            accessibilityLabel={signInLabels.verify}
            isDisabled={isBusy || !isCompleteCode(code)}
            onPress={confirmCode}
          >
            {pending === "code" ? <Spinner size="sm" /> : null}
            <Button.Label>코드 확인</Button.Label>
          </Button>

          <Button
            accessibilityLabel={signInLabels.resend}
            isDisabled={isBusy || secondsLeft > 0}
            onPress={resendCode}
            variant="tertiary"
          >
            <Button.Label>{formatResendLabel(secondsLeft)}</Button.Label>
          </Button>

          <Button
            accessibilityLabel={signInLabels.changeEmail}
            isDisabled={isBusy}
            onPress={editEmail}
            variant="ghost"
          >
            <Button.Label>다른 이메일 사용</Button.Label>
          </Button>
        </View>
      ) : (
        <View className="gap-5">
          <View className="gap-3">
            <GoogleSignInButton
              accessibilityLabel={signInLabels.google}
              colorScheme={colorScheme === "dark" ? "dark" : "light"}
              disabled={isBusy}
              onPress={startGoogle}
              signInBehavior="none"
              size="wide"
              style={googleButtonStyle}
              testID="sign-in-google"
            />

            {Platform.OS === "ios" ? (
              <AppleAuthenticationButton
                accessibilityLabel={signInLabels.apple}
                buttonStyle={
                  colorScheme === "dark"
                    ? AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthenticationButtonStyle.BLACK
                }
                buttonType={AppleAuthenticationButtonType.CONTINUE}
                onPress={startApple}
                style={appleButtonStyle}
                testID="sign-in-apple"
              />
            ) : null}

            <FailureMessage failure={failure} scope="provider" />
          </View>

          <View className="flex-row items-center gap-3">
            <Separator className="flex-1" />
            <Text className="text-muted-foreground text-sm">또는</Text>
            <Separator className="flex-1" />
          </View>

          <TextField>
            <Label>이메일</Label>
            <Input
              accessibilityLabel={signInLabels.email}
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              onChangeText={setEmail}
              placeholder="you@example.com"
              returnKeyType="send"
              testID="sign-in-email"
              value={email}
            />
            <Description>
              {OTP_LENGTH}자리 코드를 보내 드립니다. 계정이 없으면 새로
              만들어집니다.
            </Description>
            <FailureMessage failure={failure} scope="email" />
          </TextField>

          <Button
            accessibilityLabel={signInLabels.submitEmail}
            isDisabled={isBusy}
            onPress={submitEmail}
          >
            {pending === "email" ? <Spinner size="sm" /> : null}
            <Button.Label>계속</Button.Label>
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

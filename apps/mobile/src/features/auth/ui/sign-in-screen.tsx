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
import { Platform, ScrollView, Text, useColorScheme, View } from "react-native";
import { GoogleSignInButton } from "react-native-nitro-google-signin";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OTP_LENGTH } from "@/features/auth/config/email-otp";
import {
  describeCodeSent,
  formatResendLabel,
  isCompleteCode,
} from "@/features/auth/state/email-code";
import {
  type FailureScope,
  type ScopedFailure,
  useSignIn,
} from "@/features/auth/state/use-sign-in";

const SCREEN_PADDING = 24;
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
  const form = useSignIn();
  const colorScheme = useColorScheme();
  // This screen has no header, so the scroll view starts at the very top of the
  // display and the title would sit under the status bar without this.
  const insets = useSafeAreaInsets();
  const appName = Constants.expoConfig?.name ?? "앱";

  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-5 px-6 pb-8"
      contentContainerStyle={{
        paddingBottom: insets.bottom + SCREEN_PADDING,
        paddingTop: insets.top + SCREEN_PADDING,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2">
        <Text className="font-semibold text-2xl text-foreground">
          {appName}
        </Text>
        <Text className="text-base text-muted-foreground">
          {form.isCodeStep
            ? describeCodeSent(form.email)
            : "계정으로 로그인하면 저장한 내용을 어느 기기에서나 볼 수 있습니다."}
        </Text>
      </View>

      {form.isCodeStep ? (
        <View className="gap-4">
          <View className="gap-2">
            {/*
              The field itself carries the name, so the visible label stays out
              of the accessibility tree. Otherwise "인증 코드" matches two nodes
              and a selector can land on the caption instead of the input.
            */}
            <Label
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              인증 코드
            </Label>
            <InputOTP
              isDisabled={form.isBusy}
              maxLength={OTP_LENGTH}
              onChange={form.changeCode}
              onComplete={form.verifyCode}
              pattern={REGEXP_ONLY_DIGITS}
              textInputProps={{
                accessibilityLabel: signInLabels.code,
                autoComplete: "one-time-code",
                testID: "sign-in-code",
              }}
              value={form.code}
            >
              <InputOTP.Group>{renderSlots}</InputOTP.Group>
            </InputOTP>
            <FailureMessage failure={form.failure} scope="code" />
          </View>

          <Button
            accessibilityLabel={signInLabels.verify}
            isDisabled={form.isBusy || !isCompleteCode(form.code)}
            onPress={form.confirmCode}
          >
            {form.pending === "code" ? <Spinner size="sm" /> : null}
            <Button.Label>코드 확인</Button.Label>
          </Button>

          <Button
            accessibilityLabel={signInLabels.resend}
            isDisabled={form.isBusy || form.secondsLeft > 0}
            onPress={form.resendCode}
            variant="tertiary"
          >
            <Button.Label>{formatResendLabel(form.secondsLeft)}</Button.Label>
          </Button>

          <Button
            accessibilityLabel={signInLabels.changeEmail}
            isDisabled={form.isBusy}
            onPress={form.editEmail}
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
              disabled={form.isBusy}
              onPress={form.startGoogle}
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
                onPress={form.startApple}
                style={appleButtonStyle}
                testID="sign-in-apple"
              />
            ) : null}

            <FailureMessage failure={form.failure} scope="provider" />
          </View>

          <View className="flex-row items-center gap-3">
            <Separator className="flex-1" />
            <Text className="text-muted-foreground text-sm">또는</Text>
            <Separator className="flex-1" />
          </View>

          <TextField>
            <Label
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              이메일
            </Label>
            <Input
              accessibilityLabel={signInLabels.email}
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              onChangeText={form.changeEmail}
              placeholder="you@example.com"
              returnKeyType="send"
              testID="sign-in-email"
              value={form.email}
            />
            <Description>
              {OTP_LENGTH}자리 코드를 보내 드립니다. 계정이 없으면 새로
              만들어집니다.
            </Description>
            <FailureMessage failure={form.failure} scope="email" />
          </TextField>

          <Button
            accessibilityLabel={signInLabels.submitEmail}
            isDisabled={form.isBusy}
            onPress={form.submitEmail}
          >
            {form.pending === "email" ? <Spinner size="sm" /> : null}
            <Button.Label>계속</Button.Label>
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

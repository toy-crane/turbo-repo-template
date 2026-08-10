import { Button } from "heroui-native/button";
import { InputOTP, REGEXP_ONLY_DIGITS } from "heroui-native/input-otp";
import { Spinner } from "heroui-native/spinner";
import { View } from "react-native";

import { OTP_LENGTH } from "@/features/auth/config/email-otp";
import {
  describeCodeSent,
  formatResendLabel,
  toCodeDigits,
} from "@/features/auth/state/email-code";
import { useCodeVerify } from "@/features/auth/state/use-code-verify";
import { AuthError, AuthScreen, AuthSubtitle } from "./auth-screen";
import { signInLabels } from "./sign-in-labels";

/**
 * Pulls the code out of whatever was pasted.
 *
 * HeroUI's own transformer looks for exactly six consecutive digits and returns
 * an empty string when it cannot find them, so a clipboard holding anything
 * besides the bare code wiped the field instead of filling it. Keeping every
 * digit and dropping the rest fills what it can.
 *
 * It cannot do better than that: the component caps its hidden input at the
 * code length and does not let a caller lift the cap, so iOS truncates a longer
 * paste before this ever runs.
 */
function pastedCode(pasted: string): string {
  return toCodeDigits(pasted);
}

/**
 * `flex-1` on each slot is what makes the six boxes fill the content width.
 * The component's own slot is a fixed 44pt, which left the group short of the
 * screen and reading as accidentally left-aligned.
 */
function slotRenderer(isInvalid: boolean) {
  const outline = isInvalid ? "border-2 border-danger" : "";

  return ({ slots }: { slots: { index: number }[] }) =>
    slots.map((slot) => (
      <InputOTP.Slot
        className={`h-14 w-auto flex-1 ${outline}`}
        index={slot.index}
        key={slot.index}
      />
    ));
}

export function SignInCodeScreen({ email }: { email: string }) {
  const form = useCodeVerify(email);
  const isWaiting = form.secondsLeft > 0;

  return (
    <AuthScreen
      footer={
        <Button
          // The countdown is the whole message, so the accessible name has to
          // carry it too; a fixed name would read the same for all 60 seconds.
          accessibilityLabel={formatResendLabel(form.secondsLeft)}
          isDisabled={form.isBusy || isWaiting}
          onPress={form.resend}
          variant="tertiary"
        >
          <Button.Label>{formatResendLabel(form.secondsLeft)}</Button.Label>
        </Button>
      }
      subtitle={<AuthSubtitle>{describeCodeSent(email)}</AuthSubtitle>}
      title="코드를 입력해 주세요"
    >
      <View className="gap-2">
        <InputOTP
          isDisabled={form.isBusy}
          // Remounting on every failed attempt is what puts the caret back in
          // the first box after the wrong code is cleared.
          key={form.resetCount}
          maxLength={OTP_LENGTH}
          onChange={form.changeCode}
          pasteTransformer={pastedCode}
          pattern={REGEXP_ONLY_DIGITS}
          textInputProps={{
            accessibilityLabel: signInLabels.code,
            autoFocus: true,
            testID: "sign-in-code",
          }}
          value={form.code}
        >
          <InputOTP.Group className="w-full">
            {slotRenderer(form.failure !== undefined)}
          </InputOTP.Group>
        </InputOTP>

        {/*
          Verification starts on its own once the sixth digit lands, so without
          this the screen would simply freeze for the whole round trip.
        */}
        {form.pending === "verify" ? (
          <View
            accessibilityLabel="코드 확인 중"
            accessible
            className="flex-row items-center gap-2"
            testID="sign-in-code-checking"
          >
            <Spinner size="sm" />
          </View>
        ) : null}

        {form.failure ? (
          <AuthError testID="sign-in-error-code">
            {form.failure.message}
          </AuthError>
        ) : null}
      </View>
    </AuthScreen>
  );
}

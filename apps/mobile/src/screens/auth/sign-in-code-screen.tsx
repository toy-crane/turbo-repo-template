import { InputOTP, REGEXP_ONLY_DIGITS } from "heroui-native/input-otp";
import { Spinner } from "heroui-native/spinner";
import { type ComponentRef, type ReactNode, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { OTP_LENGTH } from "@/features/auth/config/email-otp";
import {
  describeCodeSent,
  formatResendLabel,
  toCodeDigits,
} from "@/features/auth/state/email-code";
import { useCodeVerify } from "@/features/auth/state/use-code-verify";
import {
  AuthError,
  AuthLayout,
  AuthSubtitle,
} from "@/features/auth/ui/auth-layout";
import { signInLabels } from "@/features/auth/ui/sign-in-labels";
import { useFocusOnArrival } from "@/shared/navigation/use-screen-arrival";
import { Button } from "@/shared/ui/button";

const VERIFY_PROGRESS_DELAY_MS = 1000;

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

function CodeInputTarget({
  attempt,
  children,
  isVerifying,
}: {
  attempt: number;
  children: ReactNode;
  isVerifying: boolean;
}) {
  const [visibleAttempt, setVisibleAttempt] = useState<number>();

  useEffect(() => {
    if (!isVerifying) {
      return;
    }

    const timer = setTimeout(() => {
      setVisibleAttempt(attempt);
    }, VERIFY_PROGRESS_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [attempt, isVerifying]);

  const showsProgress = isVerifying && visibleAttempt === attempt;

  return (
    <View className="min-h-14 justify-center">
      {showsProgress ? (
        <View
          accessibilityLabel={signInLabels.verifying}
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          accessible
          className="min-h-14 flex-row items-center justify-center gap-2 px-2"
          testID="sign-in-code-checking"
        >
          <Spinner
            accessibilityElementsHidden
            accessibilityRole={undefined}
            accessibilityState={undefined}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            size="sm"
          />
          <Text className="flex-shrink text-center font-medium text-muted">
            {signInLabels.verifying}
          </Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

export function SignInCodeScreen({ email }: { email: string }) {
  const form = useCodeVerify(email);
  const isWaiting = form.secondsLeft > 0;
  const codeRef = useFocusOnArrival<ComponentRef<typeof InputOTP>>();

  return (
    <AuthLayout
      footer={
        <Button
          // The countdown is the whole message, so the accessible name has to
          // carry it too; a fixed name would read the same for all 60 seconds.
          accessibilityLabel={formatResendLabel(form.secondsLeft)}
          isDisabled={form.isBusy || isWaiting}
          isPending={form.pending === "resend"}
          onPress={form.resend}
          variant="tertiary"
        >
          {formatResendLabel(form.secondsLeft)}
        </Button>
      }
      subtitle={<AuthSubtitle>{describeCodeSent(email)}</AuthSubtitle>}
      title="코드를 입력해 주세요"
    >
      <View className="gap-2">
        <CodeInputTarget
          attempt={form.resetCount}
          isVerifying={form.pending === "verify"}
        >
          <InputOTP
            isDisabled={form.isBusy}
            // Remounting clears the wrong code. The ref focuses the new input.
            key={form.resetCount}
            maxLength={OTP_LENGTH}
            onChange={form.changeCode}
            pasteTransformer={pastedCode}
            pattern={REGEXP_ONLY_DIGITS}
            ref={codeRef}
            textInputProps={{
              accessibilityLabel: signInLabels.code,
              testID: "sign-in-code",
            }}
            value={form.code}
          >
            <InputOTP.Group className="w-full">
              {slotRenderer(form.failure !== undefined)}
            </InputOTP.Group>
          </InputOTP>
        </CodeInputTarget>

        {form.failure ? (
          <AuthError testID="sign-in-error-code">
            {form.failure.message}
          </AuthError>
        ) : null}
      </View>
    </AuthLayout>
  );
}

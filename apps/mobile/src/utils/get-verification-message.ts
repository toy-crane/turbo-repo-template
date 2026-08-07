export function getVerificationMessage(isVerified: boolean) {
  return isVerified
    ? "Development Build 검증 완료"
    : "Development Build 검증 대기";
}

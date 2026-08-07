export type VerificationStatus = "pending" | "unavailable" | "verified";

const verificationMessages: Record<VerificationStatus, string> = {
  pending: "Development Build 검증 대기",
  unavailable: "Development Build 런타임을 확인할 수 없음",
  verified: "Development Build 검증 완료",
};

export function getVerificationMessage(status: VerificationStatus) {
  return verificationMessages[status];
}

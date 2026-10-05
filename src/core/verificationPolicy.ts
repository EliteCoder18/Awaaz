import type { VerificationIssue, VerificationPolicy } from "./types";
export const MAX_MONEY = 2_100_000_000_000_000n;
export const validMoney = (n: bigint): boolean => n >= 0n && n <= MAX_MONEY;
export function validatePolicy(
  policy?: VerificationPolicy,
): VerificationIssue[] {
  return !policy || !validMoney(policy.maxFeeSats)
    ? [
        {
          code: "INTENT_UNCONFIRMED",
          severity: "warning",
          actual: "Confirm a valid maximum fee.",
        },
      ]
    : [];
}

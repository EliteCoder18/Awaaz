// Shared request/response shapes for the AI routes. Used by the server
// (validation, JSON schema) and the browser (reading responses strictly).
import type { Locale } from "./types";

export const AI_DECISIONS = ["go", "pause", "block"] as const;
export type AiDecision = (typeof AI_DECISIONS)[number];
export const AI_REASON_CODES = [
  "SCAM_PRESSURE",
  "IMPERSONATION",
  "NEW_RECIPIENT",
  "LOOKALIKE_ADDRESS",
  "UNUSUAL_AMOUNT",
  "CODE_MISMATCH",
  "MISSING_INFO",
  "OTHER",
] as const;
export type AiReasonCode = (typeof AI_REASON_CODES)[number];

export interface AiContact {
  id: string;
  displayName: string;
  aliases: string[];
}
export interface AiIntentRequest {
  transcript: string;
  locale: Locale;
  contacts: AiContact[];
}
export interface AiIntentResponse {
  recipientId: string | null;
  amountValue: string | null;
  unit: "sats" | "btc" | null;
  clarification: string | null;
}

export interface AiReviewRequest {
  locale: Locale;
  instruction: string;
  codeVerdict: "MATCH" | "MISMATCH" | "INCOMPLETE";
  issues: string[];
  recipientName: string;
  facts: Record<string, string>;
  outputs: { address: string; sats: string; role: string }[];
  purpose: string;
  relationship: "known" | "new" | "unsure";
  independentlyVerified: boolean;
}
export interface AiReviewResponse {
  decision: AiDecision;
  reasons: { code: AiReasonCode; text: string }[];
  explanation: string;
  followUps: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length <= max;

export function readAiIntent(
  value: unknown,
  contacts: AiContact[],
): AiIntentResponse {
  if (!isObject(value)) throw new Error("Invalid AI intent.");
  const { recipientId, amountValue, unit, clarification } = value;
  if (
    !(recipientId === null || contacts.some((c) => c.id === recipientId)) ||
    !(
      amountValue === null ||
      (typeof amountValue === "string" &&
        /^(?:0|[1-9]\d{0,15})(?:\.\d{1,8})?$/.test(amountValue))
    ) ||
    !(unit === null || unit === "sats" || unit === "btc") ||
    !(clarification === null || text(clarification, 300))
  )
    throw new Error("Invalid AI intent.");
  return {
    recipientId: recipientId as string | null,
    amountValue: amountValue as string | null,
    unit: unit as AiIntentResponse["unit"],
    clarification: clarification as string | null,
  };
}

export function readAiReview(value: unknown): AiReviewResponse {
  if (!isObject(value)) throw new Error("Invalid AI review.");
  const { decision, reasons, explanation, followUps } = value;
  if (
    !AI_DECISIONS.includes(decision as AiDecision) ||
    !Array.isArray(reasons) ||
    reasons.length > 4 ||
    !reasons.every(
      (r) =>
        isObject(r) &&
        AI_REASON_CODES.includes(r.code as AiReasonCode) &&
        text(r.text, 400),
    ) ||
    !text(explanation, 1200) ||
    !Array.isArray(followUps) ||
    followUps.length > 3 ||
    !followUps.every((q) => text(q, 300))
  )
    throw new Error("Invalid AI review.");
  return {
    decision: decision as AiDecision,
    reasons: reasons as AiReviewResponse["reasons"],
    explanation: explanation as string,
    followUps: followUps as string[],
  };
}

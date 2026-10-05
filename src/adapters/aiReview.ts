import {
  readAiReview,
  type AiReviewRequest,
  type AiReviewResponse,
} from "../core/aiContract";
import { presentReport } from "../core/reportPresenter";
import type {
  ConfirmedIntent,
  Locale,
  PaymentContext,
  ReviewResult,
  WalletProfile,
} from "../core/types";
import { postAiJson } from "./aiClient";

// Minimal, bigint-free summary of the checked facts for the AI judge.
export function buildReviewRequest(
  result: ReviewResult,
  intent: ConfirmedIntent,
  profile: WalletProfile,
  context: PaymentContext,
  locale: Locale,
): AiReviewRequest {
  const report = result.receipt.report;
  const name =
    profile.addressBook.find((e) => e.id === intent.recipientAlias)
      ?.displayName ?? intent.recipientAlias;
  return {
    locale,
    instruction: intent.transcript.slice(0, 500),
    codeVerdict: report.verdict,
    issues: presentReport(report, "en-IN")
      .details.slice(0, 30)
      .map((d) => d.slice(0, 300)),
    recipientName: name.slice(0, 64),
    facts: Object.fromEntries(
      Object.entries(report.speakableParameters).filter(
        ([key]) => key !== "recipientAddress",
      ),
    ),
    outputs: result.facts.outputs.slice(0, 100).map((o) => ({
      address: (o.displayAddress ?? o.scriptHex).slice(0, 120),
      sats: o.valueSats.toString(),
      role:
        o.scriptHex.toLowerCase() === intent.recipientScriptHex.toLowerCase()
          ? "intended recipient"
          : o.classification,
    })),
    purpose: context.purpose.slice(0, 500),
    relationship: context.relationship,
    independentlyVerified: context.independentlyVerified,
  };
}

export async function requestAiReview(
  request: AiReviewRequest,
  signal: AbortSignal,
): Promise<AiReviewResponse> {
  return readAiReview(await postAiJson("/api/ai/review", request, signal));
}

import type {
  ReviewResult,
  ReviewSnapshot,
  TransactionFacts,
  VerificationReport,
} from "./types";
import { parsePsbt } from "./psbtParser";
import { verifyPayment } from "./verificationEngine";
import { createReviewBinding } from "./reviewBinding";
export async function runReview(
  snapshot: ReviewSnapshot,
): Promise<ReviewResult> {
  let facts: TransactionFacts, report: VerificationReport;
  try {
    facts = parsePsbt(snapshot.psbtBytes, snapshot.profile, snapshot.evidence);
    report = verifyPayment(snapshot.intent, facts, snapshot.profile);
  } catch (error) {
    facts = {
      networkContext: "testnet",
      outputs: [],
      outputTotalSats: 0n,
      warnings: [],
      evidenceComplete: false,
    };
    report = {
      verdict: "INCOMPLETE",
      issues: [
        {
          code: "PARSE_FAILED",
          severity: "warning",
          actual:
            error instanceof Error
              ? error.message
              : "Unable to decode the transaction.",
        },
      ],
      summaryKey: "verification.incomplete",
      speakableParameters: {},
    };
  }
  report.context = snapshot.intent.context;
  return {
    facts,
    receipt: {
      binding: await createReviewBinding(snapshot),
      report,
      sessionId: snapshot.sessionId,
      revision: snapshot.revision,
    },
  };
}

import type {
  ConfirmedIntent,
  PaymentContext,
  Locale,
  PaymentIntent,
  PrevoutEvidence,
  ReviewResult,
  WalletProfile,
} from "../core/types";
import { DEMO_WALLET_PROFILE } from "../demo/fixtures";
export type WorkflowPhase =
  | "idle"
  | "capturing_intent"
  | "reviewing_intent"
  | "intent_ready"
  | "psbt_loaded"
  | "verifying"
  | "match"
  | "mismatch"
  | "incomplete";
export interface WorkflowState {
  phase: WorkflowPhase;
  sessionId: number;
  revision: number;
  locale: Locale;
  transcript: string;
  context: PaymentContext;
  feeText: string;
  profile: WalletProfile;
  profileReviewed: boolean;
  draft?: PaymentIntent;
  intent?: ConfirmedIntent;
  psbtBytes?: Uint8Array;
  psbtName?: string;
  evidence: PrevoutEvidence;
  result?: ReviewResult;
  error?: string;
  notice?: string;
}
export type WorkflowEvent =
  | { type: "SUSPEND" }
  | { type: "EDIT_CONTEXT"; context: PaymentContext }
  | { type: "EDIT_TRANSCRIPT"; transcript: string }
  | { type: "SET_LOCALE"; locale: Locale }
  | { type: "SET_FEE"; feeText: string }
  | { type: "PROFILE_EDIT" }
  | { type: "SET_PROFILE"; profile: WalletProfile }
  | { type: "SET_DRAFT"; draft: PaymentIntent }
  | { type: "CONFIRM_INTENT"; intent: ConfirmedIntent }
  | { type: "START_LISTENING" }
  | {
      type: "SPEECH_RESULT";
      transcript: string;
      sessionId: number;
      revision: number;
    }
  | { type: "SET_PSBT"; bytes: Uint8Array; name: string }
  | { type: "EDIT_PSBT" }
  | { type: "SET_EVIDENCE"; evidence: PrevoutEvidence }
  | { type: "START_VERIFYING" }
  | { type: "SET_RESULT"; result: ReviewResult }
  | { type: "SET_ERROR"; error: string; sessionId?: number; revision?: number }
  | { type: "RESET" };
export const initialWorkflowState: WorkflowState = {
  phase: "idle",
  sessionId: 0,
  revision: 0,
  locale: "en-IN",
  transcript: "",
  context: {
    purpose: "",
    relationship: "unsure",
    independentlyVerified: false,
  },
  feeText: "2000",
  profile: DEMO_WALLET_PROFILE,
  profileReviewed: true,
  evidence: { previousTransactions: [] },
};
function invalidate(s: WorkflowState, intent = false): WorkflowState {
  return {
    ...s,
    revision: s.revision + 1,
    result: undefined,
    error: undefined,
    notice: s.result
      ? "Review invalidated. Verify the changed data again."
      : undefined,
    ...(intent ? { intent: undefined, draft: undefined } : {}),
    phase: intent ? "idle" : s.intent ? "intent_ready" : "idle",
  };
}
export function workflowReducer(
  s: WorkflowState,
  e: WorkflowEvent,
): WorkflowState {
  switch (e.type) {
    case "SUSPEND":
      if (s.phase !== "verifying" && s.phase !== "capturing_intent") return s;
      return {
        ...invalidate(s, s.phase === "capturing_intent"),
        phase:
          s.phase === "capturing_intent"
            ? "idle"
            : s.intent && s.psbtBytes
              ? "psbt_loaded"
              : "idle",
      };
    case "EDIT_CONTEXT":
      return { ...invalidate(s, true), context: e.context };
    case "RESET":
      return {
        ...initialWorkflowState,
        locale: s.locale,
        sessionId: s.sessionId + 1,
      };
    case "EDIT_TRANSCRIPT":
      return { ...invalidate(s, true), transcript: e.transcript };
    case "SET_LOCALE":
      return { ...invalidate(s, true), locale: e.locale };
    case "SET_FEE":
      return { ...invalidate(s, true), feeText: e.feeText };
    case "PROFILE_EDIT":
      return { ...invalidate(s, true), profileReviewed: false };
    case "SET_PROFILE":
      return {
        ...invalidate(s, true),
        profile: e.profile,
        profileReviewed: true,
        feeText: e.profile.source === "demo" ? "2000" : "",
        psbtBytes: undefined,
        psbtName: undefined,
        evidence: { previousTransactions: [] },
      };
    case "SET_DRAFT":
      return {
        ...s,
        draft: e.draft,
        intent: undefined,
        result: undefined,
        error: undefined,
        phase: "reviewing_intent",
      };
    case "CONFIRM_INTENT":
      if (
        !s.profileReviewed ||
        !s.draft ||
        e.intent.revision !== s.revision ||
        e.intent.transcript !== s.transcript ||
        s.draft.ambiguities.length
      )
        return s;
      return {
        ...s,
        intent: e.intent,
        result: undefined,
        phase: s.psbtBytes ? "psbt_loaded" : "intent_ready",
        error: undefined,
        notice: undefined,
      };
    case "START_LISTENING":
      return { ...invalidate(s, true), phase: "capturing_intent" };
    case "SPEECH_RESULT":
      if (
        e.sessionId !== s.sessionId ||
        e.revision !== s.revision ||
        s.phase !== "capturing_intent"
      )
        return s;
      return { ...invalidate(s, true), transcript: e.transcript };
    case "SET_PSBT":
      return {
        ...invalidate(s),
        psbtBytes: e.bytes,
        psbtName: e.name,
        phase: s.intent ? "psbt_loaded" : "idle",
      };
    case "EDIT_PSBT":
      return { ...invalidate(s), psbtBytes: undefined, psbtName: undefined };
    case "SET_EVIDENCE":
      return { ...invalidate(s), evidence: e.evidence };
    case "START_VERIFYING":
      if (
        !s.intent ||
        !s.psbtBytes ||
        !s.profileReviewed ||
        s.intent.transcript !== s.transcript
      )
        return s;
      return {
        ...s,
        phase: "verifying",
        result: undefined,
        error: undefined,
        notice: undefined,
      };
    case "SET_RESULT":
      if (
        s.phase !== "verifying" ||
        e.result.receipt.sessionId !== s.sessionId ||
        e.result.receipt.revision !== s.revision
      )
        return s;
      return {
        ...s,
        result: e.result,
        phase: e.result.receipt.report.verdict.toLowerCase() as WorkflowPhase,
        error: undefined,
      };
    case "SET_ERROR":
      if (
        (e.sessionId !== undefined && e.sessionId !== s.sessionId) ||
        (e.revision !== undefined && e.revision !== s.revision)
      )
        return s;
      return { ...s, error: e.error, result: undefined, phase: "incomplete" };
  }
}

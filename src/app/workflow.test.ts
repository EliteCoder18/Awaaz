import { describe, it, expect } from "vitest";
import { initialWorkflowState, workflowReducer } from "./workflow";
import { confirmIntent } from "../core/intentConfirmation";
import { interpretIntent } from "../core/intentInterpreter";
import { CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE } from "../demo/fixtures";
import { fromBase64 } from "../core/encoding";
const draft = interpretIntent(
  { transcript: "Send 50000 sats to Riya", locale: "en-IN", source: "edited" },
  DEMO_WALLET_PROFILE.addressBook,
);
function ready() {
  let s = workflowReducer(initialWorkflowState, {
    type: "EDIT_TRANSCRIPT",
    transcript: draft.transcript,
  });
  s = workflowReducer(s, { type: "SET_DRAFT", draft });
  s = workflowReducer(s, {
    type: "CONFIRM_INTENT",
    intent: confirmIntent(
      draft,
      draft.expectedScriptHexes[0],
      { maxFeeSats: 2000n, revision: s.revision },
      s.revision,
    ),
  });
  return workflowReducer(s, {
    type: "SET_PSBT",
    bytes: fromBase64(CORRECT_PSBT_BASE64),
    name: "fixture.psbt",
  });
}
describe("revisioned workflow", () => {
  it("invalidates confirmation when the payment context changes", () => {
    const before = ready();
    const after = workflowReducer(before, {
      type: "EDIT_CONTEXT",
      context: {
        purpose: "Urgent help",
        relationship: "new",
        independentlyVerified: false,
      },
    } as any);
    expect(after.intent).toBeUndefined();
    expect(after.context.purpose).toBe("Urgent help");
    expect(after.revision).toBeGreaterThan(before.revision);
  });
  it("requires confirmation before verification", () =>
    expect(
      workflowReducer(initialWorkflowState, { type: "START_VERIFYING" }).phase,
    ).not.toBe("verifying"));
  it("allows a confirmed supported flow", () =>
    expect(workflowReducer(ready(), { type: "START_VERIFYING" }).phase).toBe(
      "verifying",
    ));
  it.each(["EDIT_TRANSCRIPT", "SET_FEE", "PROFILE_EDIT"] as const)(
    "invalidates intent on %s",
    (type) => {
      const s = ready(),
        next = workflowReducer(
          s,
          type === "EDIT_TRANSCRIPT"
            ? { type, transcript: "Send 5000 sats to Riya" }
            : type === "SET_FEE"
              ? { type, feeText: "100" }
              : { type },
        );
      expect(next.intent).toBeUndefined();
      expect(next.result).toBeUndefined();
      expect(next.revision).toBeGreaterThan(s.revision);
    },
  );
  it("retains confirmed intent but invalidates a changed PSBT", () => {
    const s = ready();
    const next = workflowReducer(s, {
      type: "SET_PSBT",
      bytes: Uint8Array.of(1),
      name: "replacement",
    });
    expect(next.intent).toBeDefined();
    expect(next.result).toBeUndefined();
    expect(next.revision).toBeGreaterThan(s.revision);
  });
  it("rejects stale worker results after reset", () => {
    const s = workflowReducer(ready(), { type: "START_VERIFYING" });
    const reset = workflowReducer(s, { type: "RESET" });
    const result = {
      facts: {
        networkContext: "testnet" as const,
        outputs: [],
        outputTotalSats: 0n,
        warnings: [],
      },
      receipt: {
        sessionId: s.sessionId,
        revision: s.revision,
        binding: {
          schemaVersion: 1 as const,
          engineVersion: "test",
          psbtHash: "a",
          intentHash: "b",
          profileHash: "c",
          evidenceHash: "d",
        },
        report: {
          verdict: "MATCH" as const,
          issues: [],
          summaryKey: "match",
          speakableParameters: {},
        },
      },
    };
    expect(workflowReducer(reset, { type: "SET_RESULT", result })).toEqual(
      reset,
    );
  });
  it("does not restore speech results after the instruction changes", () => {
    const s = workflowReducer(initialWorkflowState, {
      type: "START_LISTENING",
    });
    const edited = workflowReducer(s, {
      type: "EDIT_TRANSCRIPT",
      transcript: "new",
    });
    expect(
      workflowReducer(edited, {
        type: "SPEECH_RESULT",
        transcript: draft.transcript,
        sessionId: s.sessionId,
        revision: s.revision,
      }),
    ).toEqual(edited);
  });
  it("errors remove old verification data", () => {
    const s = ready();
    const next = workflowReducer(s, {
      type: "SET_ERROR",
      error: "Import failed",
    });
    expect(next.result).toBeUndefined();
    expect(next.phase).toBe("incomplete");
  });
});

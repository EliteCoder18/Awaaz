import { describe, expect, it } from "vitest";

import {
  CORRECT_PSBT_BASE64,
  DEMO_WALLET_PROFILE,
  TAMPERED_PSBT_BASE64,
} from "../demo/fixtures";
import { interpretIntent } from "./intentInterpreter";
import { parsePsbt } from "./psbtParser";
import { verifyPayment } from "./verificationEngine";
import { confirmIntent } from "./intentConfirmation";

const draft = interpretIntent(
  {
    transcript: "Send 50,000 sats to Riya",
    locale: "en-IN",
    source: "preset",
  },
  DEMO_WALLET_PROFILE.addressBook,
);
const intent = confirmIntent(
  draft,
  draft.expectedScriptHexes[0],
  { maxFeeSats: 2_000n, revision: 1 },
  1,
);

describe("verifyPayment", () => {
  it("matches an exact recipient, amount, known change, and fee", () => {
    const report = verifyPayment(
      intent,
      parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE),
      DEMO_WALLET_PROFILE,
    );

    expect(report.verdict).toBe("MATCH");
    expect(report.issues).toEqual([]);
  });

  it("reports recipient and ten-times amount mismatches for the tampered fixture", () => {
    const report = verifyPayment(
      intent,
      parsePsbt(TAMPERED_PSBT_BASE64, DEMO_WALLET_PROFILE),
      DEMO_WALLET_PROFILE,
    );

    expect(report.verdict).toBe("MISMATCH");
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "RECIPIENT_MISMATCH",
      "AMOUNT_MISMATCH",
    ]);
    expect(report.issues[1]).toMatchObject({
      expected: "50000",
      actual: "500000",
    });
  });

  it("fails closed without inventing transaction facts for an unsupported PSBT", () => {
    const report = verifyPayment(
      intent,
      {
        networkContext: "testnet",
        outputs: [],
        outputTotalSats: 0n,
        warnings: [
          {
            code: "UNSUPPORTED_PSBT_VERSION",
            detail: "PSBT version 2 is unsupported.",
          },
        ],
      },
      DEMO_WALLET_PROFILE,
    );

    expect(report.verdict).toBe("INCOMPLETE");
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "UNSUPPORTED_PSBT_VERSION",
    ]);
  });

  it("returns incomplete when the fee cannot be computed", () => {
    const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    const report = verifyPayment(
      intent,
      { ...facts, inputTotalSats: undefined, feeSats: undefined },
      DEMO_WALLET_PROFILE,
    );

    expect(report.verdict).toBe("INCOMPLETE");
    expect(report.issues.map((issue) => issue.code)).toContain(
      "FEE_UNAVAILABLE",
    );
  });

  it("treats an additional unknown non-zero output as a mismatch", () => {
    const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    const report = verifyPayment(
      intent,
      {
        ...facts,
        outputs: [
          ...facts.outputs,
          {
            index: 2,
            valueSats: 2_000n,
            scriptHex: `0014${"44".repeat(20)}`,
            classification: "unknown",
          },
        ],
      },
      DEMO_WALLET_PROFILE,
    );

    expect(report.verdict).toBe("MISMATCH");
    expect(report.issues.map((issue) => issue.code)).toContain(
      "UNKNOWN_OUTPUT",
    );
  });

  it("returns only an incomplete-intent issue when the recipient is ambiguous", () => {
    const report = verifyPayment(
      {
        transcript: "Send 50,000 sats to Riya or Asha",
        locale: "en-IN",
        amountSats: 50_000n,
        expectedScriptHexes: [],
        ambiguities: [
          {
            code: "AMBIGUOUS_RECIPIENT",
            detail: "More than one recipient was mentioned.",
          },
        ],
      },
      parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE),
      DEMO_WALLET_PROFILE,
    );

    expect(report.verdict).toBe("INCOMPLETE");
    expect(report.issues.map((issue) => issue.code)).toEqual([
      "INTENT_AMBIGUOUS",
    ]);
  });
});

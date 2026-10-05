import { describe, expect, it } from "vitest";

import { presentReport } from "./reportPresenter";
import type { VerificationReport } from "./types";

const mismatchReport: VerificationReport = {
  verdict: "MISMATCH",
  summaryKey: "verification.mismatch",
  speakableParameters: {
    recipient: "riya",
    expectedAmount: "50000",
    actualAmount: "500000",
    fee: "1000",
  },
  issues: [
    {
      code: "RECIPIENT_MISMATCH",
      severity: "danger",
      expected: "riya",
      actual: "tb1qexample",
    },
    {
      code: "AMOUNT_MISMATCH",
      severity: "danger",
      expected: "50000",
      actual: "500000",
    },
  ],
};

describe("presentReport", () => {
  it("includes advisory context in both languages and the same spoken report", () => {
    const report = {
      ...mismatchReport,
      context: {
        purpose: "Urgent medical help",
        relationship: "new" as const,
        independentlyVerified: false,
      },
    };
    expect(presentReport(report, "en-IN").speech).toContain("urgent request");
    expect(presentReport(report, "hi-IN").speech).toContain(
      "Urgent medical help",
    );
  });
  it("reads every financial fact for a matching transaction", () => {
    const localized = presentReport(
      {
        ...mismatchReport,
        verdict: "MATCH",
        issues: [],
        speakableParameters: {
          recipient: "Riya",
          recipientAddress: "tb1qexample",
          actualAmount: "50000",
          fee: "1000",
          change: "9000",
          debit: "51000",
          maxFee: "2000",
        },
      },
      "en-IN",
    );
    expect(localized.speech).toContain("50,000");
    expect(localized.speech).toContain("1,000");
    expect(localized.speech).toContain("51,000");
    expect(localized.speech).toContain("9,000");
    expect(localized.speech).toContain(
      "does not prove ownership, chain inclusion or that inputs remain unspent",
    );
  });
  it("builds matching English visual and spoken warnings from one report", () => {
    const localized = presentReport(mismatchReport, "en-IN");

    expect(localized.title).toBe("Transaction does not match");
    expect(localized.instruction).toContain("Do not sign");
    expect(localized.details).toContain(
      "Amount mismatch: expected 50,000 sats, actual 5,00,000 sats.",
    );
    expect(localized.speech).toContain(localized.instruction);
    expect(localized.speech).toContain("Intended recipient: riya");
    expect(localized.speech).not.toContain("Recipient: riya");
  });

  it("builds a Hindi warning from the same structured report", () => {
    const localized = presentReport(mismatchReport, "hi-IN");

    expect(localized.title).toBe("लेन-देन मेल नहीं खाता");
    expect(localized.instruction).toContain("साइन न करें");
    expect(localized.details).toContain(
      "राशि मेल नहीं खाती: अपेक्षित 50,000 सैट्स, वास्तविक 5,00,000 सैट्स।",
    );
    expect(localized.speech).toContain(localized.instruction);
  });
});

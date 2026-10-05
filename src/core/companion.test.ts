import { describe, expect, it } from "vitest";
import { assessPaymentContext } from "./paymentContext";
import { parsePaymentRequest } from "./paymentRequest";
import { answerReviewQuestion } from "./reviewConversation";
import { parsePsbt } from "./psbtParser";
import { verifyPayment } from "./verificationEngine";
import { confirmIntent } from "./intentConfirmation";
import { interpretIntent } from "./intentInterpreter";
import {
  CORRECT_PSBT_BASE64,
  buildDemoPsbt,
  DEMO_WALLET_PROFILE,
  RIYA_SCRIPT_HEX,
} from "../demo/fixtures";
const address = DEMO_WALLET_PROFILE.addressBook[0].address!;
const context = {
  purpose: "Riya called urgently for emergency medical help",
  relationship: "new" as const,
  independentlyVerified: false,
};
const draft = interpretIntent(
  { transcript: "Send 50000 sats to Riya", locale: "en-IN", source: "preset" },
  DEMO_WALLET_PROFILE.addressBook,
);
const intent = {
  ...confirmIntent(
    draft,
    RIYA_SCRIPT_HEX,
    { maxFeeSats: 2000n, revision: 1 },
    1,
  ),
  context,
};
const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
const result = {
  facts,
  receipt: { report: verifyPayment(intent, facts, DEMO_WALLET_PROFILE) },
} as any;
describe("context is advisory, not an invented fraud verdict", () => {
  it("flags urgency, a new recipient and unchecked identity while facts still MATCH", () => {
    expect(assessPaymentContext(context, "en-IN").map((n) => n.code)).toEqual([
      "URGENCY",
      "NEW_RECIPIENT",
      "IDENTITY_UNCHECKED",
    ]);
    expect(result.receipt.report.verdict).toBe("MATCH");
  });
  it("does not mistake negated urgency for pressure", () => {
    expect(
      assessPaymentContext(
        {
          ...context,
          purpose: "This is not urgent",
          relationship: "known",
          independentlyVerified: true,
        },
        "en-IN",
      ),
    ).toEqual([]);
  });
});
describe("payment request trust boundary", () => {
  it("decodes exact BTC and untrusted labels without proving identity", () => {
    const r = parsePaymentRequest(
      `bitcoin:${address}?amount=0.00050000&label=Riya&message=Help%20today`,
    );
    expect(r.amountSats).toBe(50000n);
    expect(r.label).toBe("Riya");
    expect(r.identityVerified).toBe(false);
    expect(r.address).toBe(address);
  });
  it("supports a plain public testnet address", () =>
    expect(parsePaymentRequest(address).address).toBe(address));
  it.each([
    "amount=0.000000001",
    "amount=-1",
    "amount=1&amount=2",
    "amount=1&AMOUNT=2",
    "req-unknown=value",
    "label=%ZZ",
    "amount=1,000",
    "amount=NaN",
  ])("rejects unsafe URI %s", (query) =>
    expect(() => parsePaymentRequest(`bitcoin:${address}?${query}`)).toThrow(),
  );
  it("rejects mainnet and external links without fetching", () => {
    expect(() => parsePaymentRequest("https://example.com/request")).toThrow();
    expect(() =>
      parsePaymentRequest("bitcoin:bc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3h8ffkz"),
    ).toThrow();
  });
});
describe("conversation grounded in current checked facts", () => {
  it.each(["en-IN", "hi-IN"] as const)(
    "shows all external payments and discrepancies in %s amount answers",
    (locale) => {
      const extraFacts = parsePsbt(buildDemoPsbt("extra"), DEMO_WALLET_PROFILE);
      const extra = {
        ...result,
        facts: extraFacts,
        receipt: {
          ...result.receipt,
          report: verifyPayment(intent, extraFacts, DEMO_WALLET_PROFILE),
        },
      };
      const answer = answerReviewQuestion(
        locale === "en-IN"
          ? "What is the payment amount?"
          : "भुगतान राशि क्या है?",
        extra,
        context,
        locale,
      );
      expect(answer.text).toContain("52,000");
      expect(answer.text).toContain("50,000");
      expect(answer.text).toContain(
        locale === "en-IN" ? "Do not sign" : "साइन न करें",
      );
    },
  );
  it("answers exact total debit and change", () => {
    expect(
      answerReviewQuestion(
        "How much leaves my wallet?",
        result,
        context,
        "en-IN",
      ).text,
    ).toContain("51,000");
    expect(
      answerReviewQuestion("Where is the change?", result, context, "en-IN")
        .text,
    ).toContain("9,000");
  });
  it("never turns MATCH into proven safety", () => {
    const a = answerReviewQuestion("Am I safe?", result, context, "en-IN");
    expect(a.kind).toBe("limits");
    expect(a.text).toContain("cannot prove");
  });
  it("answers Hindi financial questions from the same facts", () =>
    expect(
      answerReviewQuestion("कितना शुल्क है?", result, context, "hi-IN").text,
    ).toContain("1,000"));
  it("abstains on unsupported questions and missing reviews", () => {
    expect(
      answerReviewQuestion(
        "What is tomorrow's bitcoin price?",
        result,
        context,
        "en-IN",
      ).kind,
    ).toBe("unsupported");
    expect(
      answerReviewQuestion("What is the fee?", undefined, context, "en-IN")
        .kind,
    ).toBe("unavailable");
  });
});

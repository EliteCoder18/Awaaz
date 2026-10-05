import { describe, it, expect } from "vitest";
import {
  CORRECT_PSBT_BASE64,
  DEMO_WALLET_PROFILE,
  RIYA_SCRIPT_HEX,
} from "../demo/fixtures";
import { interpretIntent } from "./intentInterpreter";
import { parsePsbt } from "./psbtParser";
import { verifyPayment } from "./verificationEngine";

const draft = interpretIntent(
  { transcript: "Send 50,000 sats to Riya", locale: "en-IN", source: "edited" },
  DEMO_WALLET_PROFILE.addressBook,
);
const intent = {
  ...draft,
  confirmed: true as const,
  recipientAlias: "riya",
  recipientScriptHex: RIYA_SCRIPT_HEX,
  amountSats: 50_000n,
  policy: { maxFeeSats: 2_000n, revision: 1 },
  revision: 1,
};

describe("security regressions", () => {
  it.each([
    "Send .0005 BTC to Riya",
    "Send .5 BTC to Riya",
    "Send .0005 sats to Riya",
  ])(
    "rejects unsupported leading decimal rather than dropping the dot: %s",
    (transcript) => {
      expect(
        interpretIntent(
          { transcript, locale: "en-IN", source: "edited" },
          DEMO_WALLET_PROFILE.addressBook,
        ).ambiguities.length,
      ).toBeGreaterThan(0);
    },
  );
  it("rejects additional value even when the extra recipient is known", () => {
    const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    const report = verifyPayment(
      intent,
      {
        ...facts,
        outputs: [
          ...facts.outputs,
          {
            index: 2,
            scriptHex: RIYA_SCRIPT_HEX,
            valueSats: 1_000n,
            classification: "recipient",
          },
        ],
      },
      DEMO_WALLET_PROFILE,
    );
    expect(report.verdict).toBe("MISMATCH");
    expect(report.issues.some((i) => i.code === "AMOUNT_MISMATCH")).toBe(true);
  });
  it("does not trust an attacker supplied change classification", () => {
    const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    const report = verifyPayment(
      intent,
      {
        ...facts,
        outputs: [
          ...facts.outputs,
          {
            index: 2,
            scriptHex: `0014${"66".repeat(20)}`,
            valueSats: 1_000n,
            classification: "change",
          },
        ],
      },
      DEMO_WALLET_PROFILE,
    );
    expect(report.verdict).toBe("MISMATCH");
  });
  it("rejects a fee above the confirmed cap", () => {
    const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    expect(
      verifyPayment(
        intent,
        {
          ...facts,
          inputTotalSats: facts.outputTotalSats + 2_001n,
          feeSats: 2_001n,
        },
        DEMO_WALLET_PROFILE,
      ).verdict,
    ).toBe("MISMATCH");
  });
  it("rejects a negative fee injected into facts", () => {
    const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    expect(
      verifyPayment(intent, { ...facts, feeSats: -1n }, DEMO_WALLET_PROFILE)
        .verdict,
    ).not.toBe("MATCH");
  });
  it("aggregates split outputs to the selected recipient", () => {
    const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    facts.outputs[0].valueSats = 25_000n;
    facts.outputs.push({ ...facts.outputs[0], index: 2 });
    expect(verifyPayment(intent, facts, DEMO_WALLET_PROFILE).verdict).toBe(
      "MATCH",
    );
  });
  it.each([
    "Send 50000 sats to Priya",
    "Do not send 50000 sats to Riya",
    "Send -50000 sats to Riya",
    "Send 50000 sats or 5000 sats to Riya",
    "Send 50,00 sats to Riya",
    "Send 0 sats to Riya",
    "Send 50,000, no 5,000 sats to Riya",
  ])("does not silently approve %s", (transcript) => {
    const parsed = interpretIntent(
      { transcript, locale: "en-IN", source: "edited" },
      DEMO_WALLET_PROFILE.addressBook,
    );
    expect(parsed.ambiguities.length).toBeGreaterThan(0);
  });
  it.each([
    "Send −50000 sats to Riya",
    "Send - 50000 sats to Riya",
    "Send ₹50000 sats to Riya",
    "Send 50/000 sats to Riya",
  ])("rejects discarded security punctuation: %s", (transcript) => {
    const parsed = interpretIntent(
      { transcript, locale: "en-IN", source: "edited" },
      DEMO_WALLET_PROFILE.addressBook,
    );
    expect(parsed.ambiguities.length).toBeGreaterThan(0);
  });
  it("understands a supported Hinglish amount", () => {
    expect(
      interpretIntent(
        {
          transcript: "Riya ko pachaas hazaar sats bhejo",
          locale: "hi-IN",
          source: "edited",
        },
        DEMO_WALLET_PROFILE.addressBook,
      ).amountSats,
    ).toBe(50_000n);
  });
});

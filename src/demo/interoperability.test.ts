import { expect, it } from "vitest";
import { Transaction } from "bitcoinjs-lib";
import manifest from "../../tests/fixtures/interoperability/public-prevout.json" with { type: "json" };
import { buildPublicPrevoutPsbt } from "./interoperability";
import { DEMO_WALLET_PROFILE, RIYA_SCRIPT_HEX } from "./fixtures";
import { interpretIntent } from "../core/intentInterpreter";
import { confirmIntent } from "../core/intentConfirmation";
import { parsePsbt } from "../core/psbtParser";
import { verifyPayment } from "../core/verificationEngine";
it("validates independently sourced public prevout bytes and exact accounting", () => {
  expect(Transaction.fromHex(manifest.rawHex).getId()).toBe(manifest.txid);
  const facts = parsePsbt(
    buildPublicPrevoutPsbt().toBuffer(),
    DEMO_WALLET_PROFILE,
  );
  expect(facts.inputTotalSats).toBe(90617n);
  expect(facts.outputTotalSats).toBe(89617n);
  expect(facts.feeSats).toBe(1000n);
  const draft = interpretIntent(
    {
      transcript: "Send 50000 sats to Riya",
      locale: "en-IN",
      source: "edited",
    },
    DEMO_WALLET_PROFILE.addressBook,
  );
  expect(
    verifyPayment(
      confirmIntent(
        draft,
        RIYA_SCRIPT_HEX,
        { maxFeeSats: 2000n, revision: 1 },
        1,
      ),
      facts,
      DEMO_WALLET_PROFILE,
    ).verdict,
  ).toBe("MATCH");
  expect(manifest.walletExported).toBe(false);
});

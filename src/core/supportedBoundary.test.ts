import { describe, expect, it } from "vitest";
import { Psbt } from "bitcoinjs-lib";
import {
  CORRECT_PSBT_BASE64,
  DEMO_WALLET_PROFILE,
  RIYA_SCRIPT_HEX,
  CHANGE_SCRIPT_HEX,
} from "../demo/fixtures";
import { parsePsbt } from "./psbtParser";
import { verifyPayment } from "./verificationEngine";
import { interpretIntent } from "./intentInterpreter";
import { confirmIntent } from "./intentConfirmation";
import { fromBase64, fromHex } from "./encoding";
const intent = confirmIntent(
  interpretIntent(
    {
      transcript: "Send 50000 sats to Riya",
      locale: "en-IN",
      source: "preset",
    },
    DEMO_WALLET_PROFILE.addressBook,
  ),
  RIYA_SCRIPT_HEX,
  { maxFeeSats: 2000n, revision: 1 },
  1,
);
describe("supported security boundary", () => {
  it("is invariant under output permutation", () => {
    const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    expect(
      verifyPayment(
        intent,
        { ...facts, outputs: [...facts.outputs].reverse() },
        DEMO_WALLET_PROFILE,
      ).verdict,
    ).toBe("MATCH");
  });
  it.each([0n, 2000n, 2001n])(
    "enforces the exact fee-cap boundary at %s",
    (fee) => {
      const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
      expect(
        verifyPayment(
          intent,
          {
            ...facts,
            feeSats: fee,
            inputTotalSats: facts.outputTotalSats + fee,
          },
          DEMO_WALLET_PROFILE,
        ).verdict,
      ).toBe(fee <= 2000n ? "MATCH" : "MISMATCH");
    },
  );
  it("permits informational zero-value OP_RETURN, but not positive data output", () => {
    const psbt = Psbt.fromBase64(CORRECT_PSBT_BASE64);
    psbt.addOutput({ script: fromHex("6a0161"), value: 0n });
    expect(
      verifyPayment(
        intent,
        parsePsbt(psbt.toBuffer(), DEMO_WALLET_PROFILE),
        DEMO_WALLET_PROFILE,
      ).verdict,
    ).toBe("MATCH");
    const positive = Psbt.fromBase64(CORRECT_PSBT_BASE64);
    positive.addOutput({ script: fromHex("6a0161"), value: 1n });
    expect(
      verifyPayment(
        intent,
        parsePsbt(positive.toBuffer(), DEMO_WALLET_PROFILE),
        DEMO_WALLET_PROFILE,
      ).verdict,
    ).toBe("MISMATCH");
  });
  it("does not approve an unsupported zero-value script", () => {
    const psbt = Psbt.fromBase64(CORRECT_PSBT_BASE64);
    psbt.addOutput({ script: fromHex("51"), value: 0n });
    expect(
      verifyPayment(
        intent,
        parsePsbt(psbt.toBuffer(), DEMO_WALLET_PROFILE),
        DEMO_WALLET_PROFILE,
      ).verdict,
    ).toBe("INCOMPLETE");
  });
  it("does not accept signatures disguised as irrelevant input metadata", () => {
    const psbt = Psbt.fromBase64(CORRECT_PSBT_BASE64);
    psbt.data.inputs[0].tapKeySig = new Uint8Array(64);
    expect(() => parsePsbt(psbt.toBuffer(), DEMO_WALLET_PROFILE)).toThrowError(
      expect.objectContaining({ code: "SIGNED_PSBT" }),
    );
  });
  it("rejects non-minimal compact-size encoding", () => {
    const original = fromBase64(CORRECT_PSBT_BASE64);
    const bytes = new Uint8Array(original.length + 2);
    bytes.set(original.subarray(0, 5));
    bytes.set([253, original[5], 0], 5);
    bytes.set(original.subarray(6), 8);
    expect(() => parsePsbt(bytes, DEMO_WALLET_PROFILE)).toThrowError(
      expect.objectContaining({ code: "MALFORMED_PSBT" }),
    );
  });
  it("blocks unsupported relative timelocks", () => {
    const psbt = Psbt.fromBase64(CORRECT_PSBT_BASE64);
    psbt.setInputSequence(0, 1);
    expect(
      verifyPayment(
        intent,
        parsePsbt(psbt.toBuffer(), DEMO_WALLET_PROFILE),
        DEMO_WALLET_PROFILE,
      ).verdict,
    ).toBe("INCOMPLETE");
  });
  it("does not infer change from a zero or small output amount", () => {
    const facts = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    facts.outputs[1].scriptHex = CHANGE_SCRIPT_HEX.replace(/22/g, "33");
    expect(verifyPayment(intent, facts, DEMO_WALLET_PROFILE).verdict).toBe(
      "MISMATCH",
    );
  });
});

import { Psbt, Transaction } from "bitcoinjs-lib";
import { describe, it, expect } from "vitest";
import {
  DEMO_WALLET_PROFILE,
  CHANGE_SCRIPT_HEX,
  RIYA_SCRIPT_HEX,
} from "../demo/fixtures";
import { fromHex } from "./encoding";
import { parsePsbt } from "./psbtParser";

function setup() {
  const previous = new Transaction();
  previous.addInput(new Uint8Array(32), 0xffffffff);
  previous.addOutput(fromHex(CHANGE_SCRIPT_HEX), 60_000n);
  const psbt = new Psbt();
  psbt.addInput({
    hash: previous.getHash(),
    index: 0,
    witnessUtxo: { script: fromHex(CHANGE_SCRIPT_HEX), value: 60_000n },
  });
  psbt.addOutput({ script: fromHex(RIYA_SCRIPT_HEX), value: 50_000n });
  psbt.addOutput({ script: fromHex(CHANGE_SCRIPT_HEX), value: 9_000n });
  return { previous, psbt };
}
describe("prevout evidence", () => {
  it("does not treat witness-only amounts as hash-validated evidence", () => {
    expect(
      parsePsbt(setup().psbt.toBase64(), DEMO_WALLET_PROFILE).evidenceComplete,
    ).toBe(false);
  });
  it("accepts independently supplied hash-linked evidence", () => {
    const { psbt, previous } = setup();
    const facts = parsePsbt(psbt.toBase64(), DEMO_WALLET_PROFILE, {
      previousTransactions: [previous.toBuffer()],
    });
    expect(facts.evidenceComplete).toBe(true);
    expect(facts.feeSats).toBe(1_000n);
  });
  it("cross-checks both UTXO representations instead of preferring the witness", () => {
    const { psbt, previous } = setup();
    psbt.updateInput(0, { nonWitnessUtxo: previous.toBuffer() });
    psbt.data.inputs[0].witnessUtxo!.value = 61_000n;
    expect(() => parsePsbt(psbt.toBase64(), DEMO_WALLET_PROFILE)).toThrow(
      /conflict/i,
    );
  });
  it("cross-checks a conflicting witness script", () => {
    const { psbt, previous } = setup();
    psbt.updateInput(0, { nonWitnessUtxo: previous.toBuffer() });
    psbt.data.inputs[0].witnessUtxo!.script = fromHex(RIYA_SCRIPT_HEX);
    expect(() => parsePsbt(psbt.toBase64(), DEMO_WALLET_PROFILE)).toThrow(
      /conflict/i,
    );
  });
  it("does not allow unsupported sighashes to reach a matching verdict", () => {
    const { psbt, previous } = setup();
    psbt.updateInput(0, {
      nonWitnessUtxo: previous.toBuffer(),
      sighashType: 2,
    });
    expect(
      parsePsbt(psbt.toBase64(), DEMO_WALLET_PROFILE).warnings.some(
        (w) => w.code === "UNSUPPORTED_SIGHASH",
      ),
    ).toBe(true);
  });
  it("rejects non-canonical Base64 and enforces the actual byte cap", () => {
    const { psbt } = setup();
    expect(() =>
      parsePsbt(psbt.toBase64() + "!", DEMO_WALLET_PROFILE),
    ).toThrow();
    expect(() =>
      parsePsbt(psbt.toBase64(), { ...DEMO_WALLET_PROFILE, maxPsbtBytes: 10 }),
    ).toThrow();
  });
});

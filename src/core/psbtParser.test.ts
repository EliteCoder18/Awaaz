import { Psbt, Transaction, networks } from "bitcoinjs-lib";
import { describe, expect, it } from "vitest";

import { parsePsbt, PsbtParseError } from "./psbtParser";
import { CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE } from "../demo/fixtures";
import { fromBase64 } from "./encoding";
import type { WalletProfile } from "./types";

const recipientScriptHex = `0014${"11".repeat(20)}`;
const changeScriptHex = `0014${"22".repeat(20)}`;

function fromHex(hex: string): Uint8Array {
  return Uint8Array.from(
    hex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)),
  );
}

const profile: WalletProfile = {
  networkContext: "testnet",
  addressBook: [
    {
      id: "riya",
      displayName: "Riya",
      aliases: ["riya", "रिया"],
      scriptHexes: [recipientScriptHex],
    },
  ],
  knownChangeScriptHexes: [changeScriptHex],
  maxPsbtBytes: 100_000,
};

describe("parsePsbt", () => {
  it.each([[Uint8Array.of(0)], [Uint8Array.of(1, 252, 1, 0, 0)]])(
    "rejects an extra complete PSBT map: %j",
    (suffix) => {
      const original = fromBase64(CORRECT_PSBT_BASE64),
        bytes = new Uint8Array(original.length + suffix.length);
      bytes.set(original);
      bytes.set(suffix, original.length);
      expect(() => parsePsbt(bytes, DEMO_WALLET_PROFILE)).toThrowError(
        expect.objectContaining({ code: "MALFORMED_PSBT" }),
      );
    },
  );
  it("extracts outputs, classifications, and a witness UTXO fee", () => {
    const psbt = new Psbt({ network: networks.testnet });
    psbt.addInput({
      hash: "00".repeat(32),
      index: 0,
      witnessUtxo: {
        script: fromHex(changeScriptHex),
        value: 60_000n,
      },
    });
    psbt.addOutput({ script: fromHex(recipientScriptHex), value: 50_000n });
    psbt.addOutput({ script: fromHex(changeScriptHex), value: 9_000n });

    const facts = parsePsbt(psbt.toBase64(), profile);

    expect(facts.inputTotalSats).toBe(60_000n);
    expect(facts.outputTotalSats).toBe(59_000n);
    expect(facts.feeSats).toBe(1_000n);
    expect(facts.outputs.map((output) => output.classification)).toEqual([
      "recipient",
      "change",
    ]);
  });

  it("rejects malformed and oversized PSBT inputs", () => {
    expect(() => parsePsbt("not-a-psbt", profile)).toThrowError(
      expect.objectContaining({ code: "MALFORMED_PSBT" }),
    );
    expect(() => parsePsbt("A".repeat(200_000), profile)).toThrowError(
      expect.objectContaining({ code: "PSBT_TOO_LARGE" }),
    );
  });

  it("returns an unavailable fee when an input omits its UTXO value", () => {
    const psbt = new Psbt({ network: networks.testnet });
    psbt.addInput({ hash: "03".repeat(32), index: 0 });
    psbt.addOutput({ script: fromHex(recipientScriptHex), value: 50_000n });

    const facts = parsePsbt(psbt.toBase64(), profile);

    expect(facts.feeSats).toBeUndefined();
    expect(facts.warnings.map((warning) => warning.code)).toContain(
      "MISSING_INPUT_VALUE",
    );
  });

  it("rejects a negative fee and a finalized PSBT", () => {
    const negativeFee = new Psbt({ network: networks.testnet });
    negativeFee.addInput({
      hash: "04".repeat(32),
      index: 0,
      witnessUtxo: { script: fromHex(changeScriptHex), value: 1_000n },
    });
    negativeFee.addOutput({
      script: fromHex(recipientScriptHex),
      value: 2_000n,
    });

    expect(() => parsePsbt(negativeFee.toBase64(), profile)).toThrowError(
      expect.objectContaining({ code: "INVALID_FEE" }),
    );

    const finalized = new Psbt({ network: networks.testnet });
    finalized.addInput({
      hash: "05".repeat(32),
      index: 0,
      witnessUtxo: { script: fromHex(changeScriptHex), value: 60_000n },
    });
    finalized.addOutput({
      script: fromHex(recipientScriptHex),
      value: 59_000n,
    });
    finalized.updateInput(0, { finalScriptWitness: Uint8Array.of(0) });

    expect(() => parsePsbt(finalized.toBase64(), profile)).toThrowError(
      expect.objectContaining({ code: "FINALIZED_PSBT" }),
    );
  });

  it("exposes parse errors as typed errors", () => {
    try {
      parsePsbt("", profile);
      expect.fail("Expected an empty PSBT to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PsbtParseError);
    }
  });

  it("returns incomplete facts for an unsupported PSBT v2 global version", () => {
    const v2Header = Uint8Array.from([
      0x70, 0x73, 0x62, 0x74, 0xff, 0x01, 0xfb, 0x04, 0x02, 0x00, 0x00, 0x00,
      0x00,
    ]);
    const base64 = btoa(String.fromCharCode(...v2Header));

    const facts = parsePsbt(base64, profile);

    expect(facts.outputs).toEqual([]);
    expect(facts.feeSats).toBeUndefined();
    expect(facts.warnings.map((warning) => warning.code)).toContain(
      "UNSUPPORTED_PSBT_VERSION",
    );
  });

  it("rejects a non-witness UTXO whose transaction hash does not match the prevout", () => {
    const previousTransaction = new Transaction();
    previousTransaction.addInput(new Uint8Array(32), 0xffffffff);
    previousTransaction.addOutput(fromHex(changeScriptHex), 60_000n);

    const psbt = new Psbt({ network: networks.testnet });
    psbt.addInput({
      hash: "ff".repeat(32),
      index: 0,
      nonWitnessUtxo: previousTransaction.toBuffer(),
    });
    psbt.addOutput({ script: fromHex(recipientScriptHex), value: 50_000n });

    expect(() => parsePsbt(psbt.toBase64(), profile)).toThrowError(
      expect.objectContaining({ code: "INVALID_NON_WITNESS_UTXO" }),
    );
  });

  it("computes a fee from a validated non-witness UTXO", () => {
    const previousTransaction = new Transaction();
    previousTransaction.addInput(new Uint8Array(32), 0xffffffff);
    previousTransaction.addOutput(fromHex(changeScriptHex), 60_000n);

    const psbt = new Psbt({ network: networks.testnet });
    psbt.addInput({
      hash: previousTransaction.getHash(),
      index: 0,
      nonWitnessUtxo: previousTransaction.toBuffer(),
    });
    psbt.addOutput({ script: fromHex(recipientScriptHex), value: 50_000n });
    psbt.addOutput({ script: fromHex(changeScriptHex), value: 9_000n });

    expect(parsePsbt(psbt.toBase64(), profile).feeSats).toBe(1_000n);
  });

  it("classifies a zero-value OP_RETURN as informational", () => {
    const psbt = new Psbt({ network: networks.testnet });
    psbt.addInput({
      hash: "06".repeat(32),
      index: 0,
      witnessUtxo: { script: fromHex(changeScriptHex), value: 60_000n },
    });
    psbt.addOutput({ script: fromHex(recipientScriptHex), value: 50_000n });
    psbt.addOutput({ script: fromHex(changeScriptHex), value: 9_000n });
    psbt.addOutput({ script: Uint8Array.of(0x6a), value: 0n });

    const facts = parsePsbt(psbt.toBase64(), profile);

    expect(facts.outputs.at(-1)?.classification).toBe("op_return");
    expect(facts.warnings.map((warning) => warning.code)).toContain(
      "OP_RETURN_PRESENT",
    );
  });
});

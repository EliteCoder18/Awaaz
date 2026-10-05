import { Psbt, Transaction } from "bitcoinjs-lib";
import { toHex } from "./encoding";
import { validMoney } from "./verificationPolicy";
import type {
  ParseWarning,
  PrevoutEvidence,
  TransactionFacts,
  ValidatedInput,
} from "./types";

// Display-order txids of inputs whose previous transaction is not yet proven.
export function missingPrevoutTxids(facts: TransactionFacts): string[] {
  return [
    ...new Set(
      (facts.inputs ?? [])
        .filter((input) => input.evidenceStatus !== "validated")
        .map((input) => input.outpoint.split(":")[0]),
    ),
  ];
}

export function validatePrevouts(
  psbt: Psbt,
  evidence: PrevoutEvidence = { previousTransactions: [] },
): { inputs: ValidatedInput[]; warnings: ParseWarning[] } {
  if (
    evidence.previousTransactions.reduce((n, b) => n + b.length, 0) >
      5_000_000 ||
    evidence.previousTransactions.some((b) => b.length > 1_000_000)
  )
    throw new Error("Previous transaction evidence exceeds the size limit.");
  const previous = new Map<string, Transaction>();
  for (const bytes of evidence.previousTransactions) {
    const tx = Transaction.fromBuffer(bytes);
    previous.set(toHex(tx.getHash()), tx);
  }
  const warnings: ParseWarning[] = [];
  const outpoints = new Set<string>();
  const inputs = psbt.txInputs.map((txInput, index): ValidatedInput => {
    const data = psbt.data.inputs[index],
      hash = toHex(txInput.hash);
    const outpoint =
      toHex(Uint8Array.from(txInput.hash).reverse()) + ":" + txInput.index;
    if (outpoints.has(outpoint)) throw new Error("Duplicate input outpoint.");
    outpoints.add(outpoint);
    let tx = data.nonWitnessUtxo
      ? Transaction.fromBuffer(data.nonWitnessUtxo)
      : previous.get(hash);
    if (tx && toHex(tx.getHash()) !== hash)
      throw new Error("Invalid non-witness UTXO transaction hash.");
    const supplied = previous.get(hash);
    if (tx && supplied && toHex(tx.toBuffer()) !== toHex(supplied.toBuffer())) {
      // Identical non-witness bodies may have different witnesses; selected output must agree.
      const a = tx.outs[txInput.index],
        b = supplied.outs[txInput.index];
      if (
        !a ||
        !b ||
        a.value !== b.value ||
        toHex(a.script) !== toHex(b.script)
      )
        throw new Error("Conflicting previous transaction evidence.");
    }
    const linked = tx?.outs[txInput.index];
    if (tx && !linked)
      throw new Error("Invalid non-witness UTXO output index.");
    const witness = data.witnessUtxo;
    if (
      linked &&
      witness &&
      (linked.value !== witness.value ||
        toHex(linked.script) !== toHex(witness.script))
    )
      throw new Error("Witness and non-witness UTXO conflict.");
    const utxo = linked ?? witness;
    if (utxo && !validMoney(utxo.value))
      throw new Error("Input amount is outside the Bitcoin money range.");
    const scriptHex = utxo ? toHex(utxo.script) : undefined;
    if (!scriptHex || !/^0014[a-f0-9]{40}$/.test(scriptHex))
      warnings.push({
        code: "UNSUPPORTED_INPUT",
        detail: "Only native P2WPKH inputs are supported.",
      });
    if (
      data.sighashType !== undefined &&
      data.sighashType !== Transaction.SIGHASH_ALL
    )
      warnings.push({
        code: "UNSUPPORTED_SIGHASH",
        detail: "Only SIGHASH_ALL is supported.",
      });
    if (
      psbt.version >= 2 &&
      ((txInput.sequence ?? 0xffffffff) & 0x80000000) === 0
    )
      warnings.push({
        code: "UNSUPPORTED_TIMELOCK",
        detail: "Relative timelocks require additional verification.",
      });
    if (!linked)
      warnings.push({
        code: "MISSING_PREVOUT_EVIDENCE",
        detail:
          "Input " + index + " needs its hash-linked previous transaction.",
      });
    if (!utxo)
      warnings.push({
        code: "MISSING_INPUT_VALUE",
        detail: "Input " + index + " has no value evidence.",
      });
    return {
      index,
      outpoint,
      sequence: txInput.sequence ?? 0xffffffff,
      scriptHex,
      valueSats: utxo?.value,
      evidenceStatus: linked ? "validated" : utxo ? "claimed" : "missing",
    };
  });
  return { inputs, warnings };
}

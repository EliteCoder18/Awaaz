import { Psbt, address, networks } from "bitcoinjs-lib";
import { fromBase64, toHex } from "./encoding";
import { validatePrevouts } from "./prevoutEvidence";
import { validMoney } from "./verificationPolicy";
import type { PrevoutEvidence, TransactionFacts, WalletProfile } from "./types";
export type PsbtParseErrorCode =
  | "EMPTY_PSBT"
  | "PSBT_TOO_LARGE"
  | "MALFORMED_PSBT"
  | "FINALIZED_PSBT"
  | "SIGNED_PSBT"
  | "INVALID_FEE"
  | "INVALID_NON_WITNESS_UTXO"
  | "EVIDENCE_CONFLICT"
  | "UNSUPPORTED_SIZE";
export class PsbtParseError extends Error {
  constructor(
    public readonly code: PsbtParseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PsbtParseError";
  }
}
// Scan maps before handing v0 to bitcoinjs. Reject duplicate keys and non-minimal sizes.
function scanEnvelope(bytes: Uint8Array): {
  version: number;
  mapCount: number;
} {
  if (toHex(bytes.subarray(0, 5)) !== "70736274ff")
    throw new Error("Invalid PSBT magic.");
  let offset = 5,
    version = 0,
    map = 0;
  const compact = (): number => {
    const p = bytes[offset++];
    if (p === undefined) throw new Error("Truncated PSBT.");
    if (p < 253) return p;
    const count = p === 253 ? 2 : p === 254 ? 4 : 8;
    if (offset + count > bytes.length) throw new Error("Truncated length.");
    let n = 0n;
    for (let i = 0; i < count; i++)
      n += BigInt(bytes[offset++]) << (8n * BigInt(i));
    if (
      (count === 2 && n < 253n) ||
      (count === 4 && n <= 65535n) ||
      (count === 8 && n <= 0xffffffffn) ||
      n > BigInt(bytes.length)
    )
      throw new Error("Non-minimal or oversized length.");
    return Number(n);
  };
  while (offset < bytes.length) {
    const keys = new Set<string>();
    let ended = false;
    while (offset < bytes.length) {
      const kl = compact();
      if (kl === 0) {
        ended = true;
        break;
      }
      if (offset + kl > bytes.length) throw new Error("Truncated key.");
      const key = bytes.subarray(offset, offset + kl);
      offset += kl;
      const hex = toHex(key);
      if (keys.has(hex)) throw new Error("Duplicate PSBT key.");
      keys.add(hex);
      const vl = compact();
      if (offset + vl > bytes.length) throw new Error("Truncated value.");
      if (map === 0 && key[0] === 0xfb) {
        if (kl !== 1 || vl !== 4)
          throw new Error("Invalid PSBT version field.");
        version = new DataView(
          bytes.buffer,
          bytes.byteOffset + offset,
          4,
        ).getUint32(0, true);
      }
      offset += vl;
    }
    if (!ended) throw new Error("Unterminated PSBT map.");
    map++;
  }
  return { version, mapCount: map };
}
export function parsePsbt(
  input: string | Uint8Array,
  profile: WalletProfile,
  evidence: PrevoutEvidence = { previousTransactions: [] },
): TransactionFacts {
  if (!input.length)
    throw new PsbtParseError("EMPTY_PSBT", "No PSBT data was provided.");
  if (
    input.length >
    (typeof input === "string"
      ? profile.maxPsbtBytes * 2 + 1024
      : profile.maxPsbtBytes)
  )
    throw new PsbtParseError(
      "PSBT_TOO_LARGE",
      "PSBT exceeds the 100,000-byte limit.",
    );
  let bytes: Uint8Array, version: number, mapCount: number;
  try {
    bytes =
      typeof input === "string"
        ? fromBase64(input, profile.maxPsbtBytes)
        : input;
    ({ version, mapCount } = scanEnvelope(bytes));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Malformed data.";
    throw new PsbtParseError(
      message.includes("size limit") ? "PSBT_TOO_LARGE" : "MALFORMED_PSBT",
      message,
    );
  }
  if (version !== 0)
    return {
      networkContext: "testnet",
      outputs: [],
      outputTotalSats: 0n,
      warnings: [
        {
          code: "UNSUPPORTED_PSBT_VERSION",
          detail: "Only PSBT v0 is supported.",
        },
      ],
      evidenceComplete: false,
    };
  let psbt: Psbt;
  try {
    psbt = Psbt.fromBuffer(bytes, { network: networks.testnet });
    if (mapCount !== 1 + psbt.inputCount + psbt.txOutputs.length)
      throw new Error("PSBT has missing or trailing maps.");
  } catch {
    throw new PsbtParseError(
      "MALFORMED_PSBT",
      "The PSBT could not be decoded.",
    );
  }
  if (
    !psbt.inputCount ||
    !psbt.txOutputs.length ||
    psbt.inputCount > 100 ||
    psbt.txOutputs.length > 100
  )
    throw new PsbtParseError(
      "UNSUPPORTED_SIZE",
      "Support is limited to 1–100 inputs and outputs.",
    );
  for (const data of psbt.data.inputs) {
    if (
      data.finalScriptSig !== undefined ||
      data.finalScriptWitness !== undefined
    )
      throw new PsbtParseError(
        "FINALIZED_PSBT",
        "Import an unsigned PSBT before finalization.",
      );
    if (data.partialSig?.length || data.tapKeySig || data.tapScriptSig?.length)
      throw new PsbtParseError(
        "SIGNED_PSBT",
        "Import an unsigned PSBT without existing signatures.",
      );
  }
  let validated: ReturnType<typeof validatePrevouts>;
  try {
    validated = validatePrevouts(psbt, evidence);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid prevout evidence.";
    throw new PsbtParseError(
      /conflict/i.test(message)
        ? "EVIDENCE_CONFLICT"
        : "INVALID_NON_WITNESS_UTXO",
      message,
    );
  }
  const warnings = [...validated.warnings];
  const outputs = psbt.txOutputs.map((o, index) => {
    if (!validMoney(o.value))
      throw new PsbtParseError(
        "MALFORMED_PSBT",
        "Output amount is outside the Bitcoin money range.",
      );
    const scriptHex = toHex(o.script);
    let displayAddress: string | undefined;
    try {
      displayAddress = address.fromOutputScript(o.script, networks.testnet);
    } catch {
      /* Non-address script remains visible as hex. */
    }
    const classification =
      scriptHex.startsWith("6a") && o.value === 0n
        ? "op_return"
        : profile.knownChangeScriptHexes.includes(scriptHex)
          ? "change"
          : profile.addressBook.some((e) => e.scriptHexes.includes(scriptHex))
            ? "recipient"
            : "unknown";
    if (classification === "op_return")
      warnings.push({
        code: "OP_RETURN_PRESENT",
        detail: "Zero-value OP_RETURN data is present.",
      });
    return {
      index,
      valueSats: o.value,
      scriptHex,
      displayAddress,
      classification,
    } as TransactionFacts["outputs"][number];
  });
  const outputTotalSats = outputs.reduce((sum, o) => sum + o.valueSats, 0n);
  if (!validMoney(outputTotalSats))
    throw new PsbtParseError(
      "MALFORMED_PSBT",
      "Output total exceeds the Bitcoin money range.",
    );
  const inputTotalSats = validated.inputs.every(
    (i) => i.valueSats !== undefined,
  )
    ? validated.inputs.reduce((sum, i) => sum + i.valueSats!, 0n)
    : undefined;
  const feeSats =
    inputTotalSats === undefined ? undefined : inputTotalSats - outputTotalSats;
  if (
    (inputTotalSats !== undefined && !validMoney(inputTotalSats)) ||
    (feeSats !== undefined && !validMoney(feeSats))
  )
    throw new PsbtParseError(
      "INVALID_FEE",
      "Input and output totals produce an invalid fee.",
    );
  return {
    networkContext: "testnet",
    outputs,
    inputs: validated.inputs,
    inputTotalSats,
    outputTotalSats,
    feeSats,
    warnings,
    evidenceComplete: validated.inputs.every(
      (i) => i.evidenceStatus === "validated",
    ),
    version: psbt.version,
    locktime: psbt.locktime,
    replaceable: psbt.txInputs.some(
      (i) => (i.sequence ?? 0xffffffff) < 0xfffffffe,
    ),
  };
}

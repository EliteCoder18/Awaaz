import { Psbt, Transaction, networks } from "bitcoinjs-lib";
import manifest from "../../tests/fixtures/interoperability/public-prevout.json" with { type: "json" };
import { fromHex } from "../core/encoding";
import { CHANGE_SCRIPT_HEX, RIYA_SCRIPT_HEX } from "./fixtures";
export function buildPublicPrevoutPsbt(): Psbt {
  const previous = Transaction.fromHex(manifest.rawHex);
  if (previous.getId() !== manifest.txid)
    throw new Error("Fixture transaction hash mismatch.");
  return new Psbt({ network: networks.testnet })
    .addInput({
      hash: manifest.txid,
      index: manifest.vout,
      sequence: 0xfffffffd,
      nonWitnessUtxo: previous.toBuffer(),
      witnessUtxo: previous.outs[manifest.vout],
    })
    .addOutput({ script: fromHex(RIYA_SCRIPT_HEX), value: 50000n })
    .addOutput({ script: fromHex(CHANGE_SCRIPT_HEX), value: 39617n });
}

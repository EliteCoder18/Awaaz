import { Psbt, Transaction, address, networks } from "bitcoinjs-lib";
import { fromHex } from "../core/encoding";
import { createWalletProfile } from "../core/walletProfile";

export const RIYA_SCRIPT_HEX = "0014" + "11".repeat(20);
export const CHANGE_SCRIPT_HEX = "0014" + "22".repeat(20);
export const UNKNOWN_SCRIPT_HEX = "0014" + "33".repeat(20);
export const ASHA_SCRIPT_HEX = "0014" + "44".repeat(20);
export const RIYA_ADDRESS = address.fromOutputScript(
  fromHex(RIYA_SCRIPT_HEX),
  networks.testnet,
);
export const CHANGE_ADDRESS = address.fromOutputScript(
  fromHex(CHANGE_SCRIPT_HEX),
  networks.testnet,
);
export const DEMO_WALLET_PROFILE = createWalletProfile({
  recipients: [
    {
      id: "riya",
      name: "Riya",
      aliases: ["riya", "रिया"],
      address: RIYA_ADDRESS,
    },
    {
      id: "asha",
      name: "Asha",
      aliases: ["asha", "आशा"],
      address: address.fromOutputScript(
        fromHex(ASHA_SCRIPT_HEX),
        networks.testnet,
      ),
    },
  ],
  changeAddresses: [CHANGE_ADDRESS],
  source: "demo",
  revision: 0,
});
export type DemoScenario =
  "correct" | "tampered" | "extra" | "high-fee" | "missing-evidence" | "split";
function demoPrevious(input: bigint): Transaction {
  const previous = new Transaction();
  previous.version = 2;
  previous.addInput(
    new Uint8Array(32),
    0xffffffff,
    0xffffffff,
    Uint8Array.of(1, 1),
  );
  previous.addOutput(fromHex(CHANGE_SCRIPT_HEX), input);
  return previous;
}
// Synthetic "explorer" for demo PSBTs: their previous transactions do not
// exist on any public chain, so the guided demo serves them locally.
export function demoPreviousTransaction(txid: string): Uint8Array | undefined {
  for (const value of [510_000n, 70_000n, 62_000n, 60_000n]) {
    const tx = demoPrevious(value);
    if (tx.getId() === txid.toLowerCase()) return tx.toBuffer();
  }
  return undefined;
}
export function buildDemoPsbt(scenario: DemoScenario): string {
  const input =
    scenario === "tampered"
      ? 510_000n
      : scenario === "high-fee"
        ? 70_000n
        : scenario === "extra"
          ? 62_000n
          : 60_000n;
  const previous = demoPrevious(input);
  const psbt = new Psbt({ network: networks.testnet });
  psbt.setVersion(2);
  psbt.addInput({
    hash: previous.getHash(),
    index: 0,
    sequence: 0xfffffffd,
    witnessUtxo: { script: fromHex(CHANGE_SCRIPT_HEX), value: input },
    ...(scenario === "missing-evidence"
      ? {}
      : { nonWitnessUtxo: previous.toBuffer() }),
  });
  psbt.addOutput({
    script: fromHex(
      scenario === "tampered" ? UNKNOWN_SCRIPT_HEX : RIYA_SCRIPT_HEX,
    ),
    value:
      scenario === "tampered"
        ? 500_000n
        : scenario === "split"
          ? 25_000n
          : 50_000n,
  });
  psbt.addOutput({ script: fromHex(CHANGE_SCRIPT_HEX), value: 9_000n });
  if (scenario === "extra")
    psbt.addOutput({ script: fromHex(ASHA_SCRIPT_HEX), value: 2_000n });
  if (scenario === "split")
    psbt.addOutput({ script: fromHex(RIYA_SCRIPT_HEX), value: 25_000n });
  return psbt.toBase64();
}
export const CORRECT_PSBT_BASE64 = buildDemoPsbt("correct");
export const TAMPERED_PSBT_BASE64 = buildDemoPsbt("tampered");

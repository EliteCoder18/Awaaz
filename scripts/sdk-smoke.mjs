import assert from "node:assert/strict";
import { Psbt, Transaction, address, networks } from "bitcoinjs-lib";
import {
  createWalletProfile,
  interpretIntent,
  confirmIntent,
  runReview,
  fromHex,
  presentReport,
  ENGINE_VERSION,
} from "../dist-sdk/awaaz.js";

// Non-broadcast fixture; no keys, signing, wallet access or network requests.
const recipientScript = "0014" + "11".repeat(20);
const changeScript = "0014" + "22".repeat(20);
const profile = createWalletProfile({
  recipients: [
    {
      id: "riya",
      name: "Riya",
      aliases: ["riya", "रिया"],
      address: address.fromOutputScript(
        fromHex(recipientScript),
        networks.testnet,
      ),
    },
  ],
  changeAddresses: [
    address.fromOutputScript(fromHex(changeScript), networks.testnet),
  ],
  source: "demo",
  revision: 1,
});
const previous = new Transaction();
previous.addInput(
  new Uint8Array(32),
  0xffffffff,
  0xffffffff,
  Uint8Array.of(1, 1),
);
previous.addOutput(fromHex(changeScript), 60000n);
const psbt = new Psbt({ network: networks.testnet });
psbt.addInput({
  hash: previous.getHash(),
  index: 0,
  nonWitnessUtxo: previous.toBuffer(),
  witnessUtxo: { script: fromHex(changeScript), value: 60000n },
});
psbt.addOutput({ script: fromHex(recipientScript), value: 50000n });
psbt.addOutput({ script: fromHex(changeScript), value: 9000n });
const draft = interpretIntent(
  { transcript: "Send 50000 sats to Riya", locale: "en-IN", source: "edited" },
  profile.addressBook,
);
const intent = confirmIntent(
  draft,
  recipientScript,
  { maxFeeSats: 2000n, revision: 1 },
  1,
);
const result = await runReview({
  intent,
  profile,
  psbtBytes: psbt.toBuffer(),
  evidence: { previousTransactions: [] },
  sessionId: 1,
  revision: 1,
});
assert.equal(result.receipt.report.verdict, "MATCH");
assert.equal(result.facts.feeSats, 1000n);
assert.match(result.receipt.binding.psbtHash, /^[a-f0-9]{64}$/);
assert.match(presentReport(result.receipt.report, "en-IN").speech, /51,000/);
console.log(
  `SDK ${ENGINE_VERSION}: Node ESM import, real PSBT, exact accounting and SHA-256 binding passed.`,
);

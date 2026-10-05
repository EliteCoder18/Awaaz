# Experimental Awaaz SDK

The grant strategy separates a free standalone review companion from future licensed wallet integrations. This repository implements the reusable core **locally**; it does not publish an npm package, claim supported-wallet compatibility, or implement licensing/billing.

```sh
npm run build:sdk
npm run test:sdk
```

ESM: `dist-sdk/awaaz.js`; declaration entry: `dist-sdk/types/sdk/index.d.ts`. Node 22+ and browsers with bigint/Web Crypto are required. bitcoinjs-lib 7.0.1 is an external runtime dependency. The smoke test imports the actual built bundle, constructs a non-broadcast PSBT without keys, and verifies exact totals plus hash binding. No React, speech, QR-image decoder or network adapter is exported.

```js
import { interpretIntent, confirmIntent, runReview, presentReport } from './dist-sdk/awaaz.js';

const draft = interpretIntent({ transcript: 'Send 50000 sats to Riya', locale: 'en-IN', source: 'edited' }, profile.addressBook);
// Obtain explicit user confirmation first. Never infer it from voice confidence or a QR label.
const intent = confirmIntent(draft, reviewedRecipientScript, { maxFeeSats: 2000n, revision: 1 }, 1);
intent.context = { purpose: 'Medical help', relationship: 'new', independentlyVerified: false };
const result = await runReview({ intent, profile, psbtBytes, evidence: { previousTransactions: [] }, sessionId: 1, revision: 1 });
const localized = presentReport(result.receipt.report, 'en-IN');
```

`profile`, `reviewedRecipientScript` and `psbtBytes` come from the integrating application; previous-transaction evidence must be embedded in the PSBT or supplied separately. `createWalletProfile` converts reviewed testnet addresses to scripts. `parsePaymentRequest` validates limited Bitcoin URI/plain-address input; labels are not identity proofs. `assessPaymentContext` supplies advisory prompts. `answerReviewQuestion` explains current facts or abstains. Other exports include `parsePsbt`, `verifyPayment`, encoding helpers and `createReviewBinding`.

Integration responsibilities: independently check identity/change ownership; enforce explicit confirmation; freeze snapshots; discard stale results after any edit; bound worker execution; present MISMATCH/INCOMPLETE as DO NOT SIGN; retain safety limits alongside MATCH. Direct SDK calls do not enforce UI consent or worker timeouts. Amounts are bigint, so ordinary JSON serialization requires explicit conversion. Hash receipts are local unsigned consistency records, not certificates.

Supported boundary remains unsigned PSBT v0, native P2WPKH inputs, SIGHASH_ALL, hash-linked previous transactions, fixed testnet address context and exact configured change scripts. No signing, chain-origin detection, unspentness check or mainnet production claim. Context changes are included in intent hashes. Fee-provider adapters remain outside the SDK and cannot alter a confirmed fee cap or verdict.

References: [bitcoinjs-lib tagged release](https://github.com/bitcoinjs/bitcoinjs-lib/tree/v7.0.1), [Bitcoin URI standard](https://github.com/bitcoin/bips/blob/master/bip-0321.mediawiki), [jsQR](https://github.com/cozmo/jsQR), [mempool testnet API](https://mempool.space/testnet/docs/api/rest).

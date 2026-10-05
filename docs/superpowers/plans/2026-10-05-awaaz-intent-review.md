# Awaaz Confirmed-Intent Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document is a proposed plan, not authorization to start implementing during the planning turn.

**Goal:** Deliver a reliable, accessible testnet payment-review companion with confirmed intent, complete output accounting and review invalidation.

**Architecture:** Extend the existing deterministic core and browser adapters. Add explicit confirmation/policy, independently configured script profiles, supporting-transaction evidence and hash-bound review results. Keep the entire workflow local and memory-only, excluding optional browser speech services.

**Tech Stack:** Existing React, TypeScript, Vite, bitcoinjs-lib 7.0.1, Vitest and Playwright; Web Crypto for review digests, Web Worker for bounded parsing. No backend or signing dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-awaaz-intent-review-design.md`

## Global constraints

- Testnet context only; no chain-origin inference, signing, broadcasting, keys, wallet connections, cloud LLMs or automatic persistence.
- bitcoinjs-lib 7.0.1; bigint monetary arithmetic; no signing/key-generation/ECC package additions.
- PSBT v0; 100,000-byte PSBT cap; previous transactions capped at 1,000,000 bytes each and 5,000,000 bytes per session; maximum 100 inputs/outputs; worker timeout 2 seconds.
- Native P2WPKH inputs, single intended recipient, exact configured change scripts, SIGHASH_ALL only, no existing signatures/finalization for the supported first release.
- Strict MATCH needs hash-linked prevout evidence for every input and explicit recipient/amount/fee-cap confirmation. MATCH describes consistency, not guaranteed safety.
- Reset/reload clears all data; edit invalidates confirmation/report as applicable. Browser speech privacy caveat must be visible before recording.
- Keep existing fixture flow, but regenerate fixtures with consistent previous transactions to satisfy stricter validation. Label them synthetic and non-broadcast.
- Final branding/animation is deferred; functional accessibility is not deferred.

## Review focus

1. A recognized contact is not automatically an authorized payment: extra known-recipient outputs must fail (Task 1).
2. Evidence can conflict across representations: witness and non-witness values/scripts must agree (Task 2).
3. Natural speech contains corrections, negation and multiple quantities: do not select an arbitrary first value (Task 3).
4. Async work can finish after reset or replacement: old results cannot restore a verdict (Task 4).
5. A digest can be correct while the trusted address is wrong: expose profile provenance and avoid ownership/identity claims (Tasks 5 and 6).

## File structure and shared contracts

Keep `src/core`, `src/adapters`, `src/app` and `src/demo`. New responsibilities:

- `src/core/verificationPolicy.ts`: supported semantics, money bounds and fee policy.
- `src/core/prevoutEvidence.ts`: previous-transaction decoding, outpoint validation and evidence consistency.
- `src/core/intentConfirmation.ts`: create confirmed intent only from resolved, explicitly approved fields.
- `src/core/reviewBinding.ts`: canonicalization, full digests and receipt freshness.
- `src/core/walletProfile.ts`: address-to-script conversion, profile validation and provenance.
- `src/adapters/verificationWorker.ts` and `src/adapters/verificationClient.ts`: isolated bounded work and cancellation.
- `src/app/IntentReview.tsx`, `WalletProfileEditor.tsx`, `TransactionReview.tsx`: accessible focused components, with App retaining orchestration only.

In `src/core/types.ts`, retain existing public functions where possible and add:

```ts
type VerificationPolicy = { maxFeeSats: bigint; revision: number };
type ConfirmedIntent = PaymentIntent & {
  recipientAlias: string; recipientScriptHex: string; amountSats: bigint;
  policy: VerificationPolicy; revision: number; confirmed: true;
};
type PrevoutEvidence = { previousTransactions: Uint8Array[] };
type ReviewSnapshot = {
  intent: ConfirmedIntent; profile: WalletProfile; psbtBytes: Uint8Array;
  evidence: PrevoutEvidence; sessionId: number; revision: number;
};
type ReviewBinding = {
  schemaVersion: 1; engineVersion: string;
  psbtHash: string; evidenceHash: string; intentHash: string; profileHash: string;
};
type ReviewReceipt = {
  binding: ReviewBinding; report: VerificationReport;
  sessionId: number; revision: number;
};
```

Policy is included in canonical intent hashing. Profiles add a revision, `source: "demo" | "user-reviewed"`, recipient addresses and change addresses; scripts are derived from those addresses, not accepted from arbitrary PSBT metadata. `TransactionFacts` gains validated inputs, tx version/locktime/sequences and evidence completeness. Issues gain explicit codes for extra recipients, fee-cap breach, evidence conflict, unsupported semantics and stale review.

## Task 1: Complete accounting and policy regressions

**Files:** Modify `src/core/{types,verificationEngine}.ts` and its tests; create `src/core/verificationPolicy.ts` and tests.

**Interfaces:** `verifyPayment(intent: ConfirmedIntent, facts: TransactionFacts, profile: WalletProfile): VerificationReport`; `validatePolicy(policy: VerificationPolicy): VerificationIssue[]`.

- [ ] Add tests named `rejectsAdditionalKnownRecipient`, `sumsDuplicateRecipientOutputs`, `ignoresUntrustedClassification`, `rejectsNegativeFee`, and `enforcesExplicitFeeCap`. Require 50,000 + 1,000 sats to Riya to fail a 50,000-sat intent; a separate 25,000 + 25,000 split to that same script may match when all other facts are valid. Fee 2,001 fails cap 2,000; fee 2,000 passes the cap check.
- [ ] Run `npm test -- src/core/verificationEngine.test.ts`; confirm new cases fail for the expected behavior, not a broken test harness.
- [ ] Implement exact script reclassification, aggregate intended amount, complete non-zero output accounting and money/fee invariants. Preserve all discovered issues; missing evidence yields INCOMPLETE even alongside mismatches.
- [ ] Run the targeted suite, including output permutation cases and zero/positive OP_RETURN cases; require all pass.
- [ ] Commit only this task's code/tests with `fix: account for every payment output and enforce fee policy`.

## Task 2: Evidence-aware bounded PSBT parsing

**Files:** Modify `src/core/psbtParser.ts`, its tests and `src/demo/fixtures.ts`; create `src/core/prevoutEvidence.ts`, its tests and the worker/client adapter files and tests.

**Interfaces:** Extend `parsePsbt(input: string | Uint8Array, profile: WalletProfile, evidence?: PrevoutEvidence): TransactionFacts`; `validatePrevouts(psbt: Psbt, evidence: PrevoutEvidence): { inputs: ValidatedInput[]; issues: VerificationIssue[] }`. Define `ValidatedInput` in types with outpoint, script, optional value, sequence and evidence status. `runVerification(snapshot: ReviewSnapshot, signal: AbortSignal): Promise<{ facts: TransactionFacts; report: VerificationReport }>` parses/verifies in a worker.

- [ ] Add failing tests for conflicting witness/non-witness value and script, invalid previous tx hash/index, missing evidence, duplicate outpoints, malformed/nonminimal encodings, duplicate map keys, unsupported version/input/sighash, signed/finalized data and all size/count bounds. Witness-only input must be INCOMPLETE under strict policy.
- [ ] Run `npm test -- src/core/psbtParser.test.ts src/core/prevoutEvidence.test.ts`; confirm failures.
- [ ] Implement evidence validation and supported-input checks. Hash-linked evidence does not assert chain inclusion/unspentness. Reject malformed data through typed errors; UI will convert errors into an incomplete report.
- [ ] Regenerate correct/tampered synthetic fixtures with matching previous transactions while preserving 50,000/500,000-sat amounts and 1,000-sat fees. Add worker termination tests for abort and 2-second timeout.
- [ ] Run the core, fixture and adapter tests; require all pass. Commit `fix: validate prevout evidence and bound PSBT processing`.

## Task 3: Strict language parsing and explicit intent confirmation

**Files:** Modify `src/core/intentInterpreter.ts` and tests; create `src/core/intentConfirmation.ts` and tests; create `src/core/fixtures/intent-corpus.json`.

**Interfaces:** Preserve `interpretIntent(speech, addressBook): PaymentIntent`; add `confirmIntent(draft: PaymentIntent, selectedScript: string, policy: VerificationPolicy, revision: number): ConfirmedIntent` (throws typed validation error for unresolved fields).

- [ ] Add a minimum 100-case corpus across English, Hindi and Hinglish, with expected fields or ambiguity codes. Include `Priya` versus `Riya`, ५०,०००, `pachaas hazaar sats`, `0.00050000 BTC`, conflicting amounts, “do not send”, “50,000, no 5,000”, negative/zero values, unsupported decimals and malformed comma grouping.
- [ ] Run `npm test -- src/core/intentInterpreter.test.ts src/core/intentConfirmation.test.ts`; verify new rejection/confirmation cases fail.
- [ ] Implement token-aware aliases and enumerated number grammar using exact integers. Refuse unsupported constructions. Confirmation requires an explicit selected address and fee cap; never auto-confirm from confidence or a preset.
- [ ] Run the corpus and confirmation tests; require exact outcomes, including abstention rather than guessed fields. Commit `feat: confirm exact bilingual payment intent`.

## Task 4: Revisioned workflow and cancellable speech

**Files:** Modify `src/app/workflow.ts`, `src/app/App.tsx`, `src/adapters/speechRecognizer.ts` and associated tests.

**Interfaces:** Add session/revision identifiers and guarded draft/confirmed/loaded/verifying/verdict states to the existing reducer; async events include identifiers. Extend recognition with an `AbortSignal` while retaining injectable factory/timeout for tests.

- [ ] Add failing tests for editing after MATCH, changing fee/profile/PSBT, malformed replacement, reset during upload/listening/worker execution, late results, repeated microphone clicks, synchronous `onend` during abort, and recognition `start()` exceptions.
- [ ] Run `npm test -- src/app src/adapters`; verify new cases expose the stale/cancellation behavior.
- [ ] Implement invalidation on edit, cancellation before reset, cleanup on settlement and reducer guards rejecting stale event identifiers. Clear old reports and stop speech immediately on invalidation. No pending result may repopulate a reset session.
- [ ] Run all app/adapter tests; require correct terminal states and no stale success. Commit `fix: invalidate stale reviews and cancel pending work`.

## Task 5: Independent recipient/change setup

**Files:** Create `src/core/walletProfile.ts`, `src/app/WalletProfileEditor.tsx` and tests; modify App and demo profile types.

**Interfaces:** `createWalletProfile(input: { recipients: { id: string; name: string; aliases: string[]; address: string }[]; changeAddresses: string[]; source: "demo" | "user-reviewed"; revision: number }): WalletProfile`.

- [ ] Add failing tests for invalid/mainnet addresses, recipient/change overlap, duplicate aliases/scripts, changed configuration invalidating confirmation, and attempted private-key input. Test visible provenance warning and required confirmation separate from PSBT import.
- [ ] Run `npm test -- src/core/walletProfile.test.ts src/app/WalletProfileEditor.test.tsx`; confirm failures.
- [ ] Implement checksum-validating address conversion using bitcoinjs-lib; reject malformed/profile-conflicting entries. Accept only addresses, never seeds/xpubs/private keys. Render the exact address, source and explicit limitation that self-entered addresses do not prove ownership or identity.
- [ ] Run tests; require deterministic scripts and keyboard-accessible confirmation. Commit `feat: configure independently reviewed payment scripts`.

## Task 6: Hash-bound review receipts

**Files:** Create `src/core/reviewBinding.ts` and tests; update types, workflow and verification client.

**Interfaces:** `createReviewBinding(snapshot: ReviewSnapshot): Promise<ReviewBinding>`; `isSameReview(a: ReviewBinding, b: ReviewBinding): boolean`. A receipt is created only for the current completed snapshot; export/persistence is not part of this task.

- [ ] Add failing tests: same snapshot gives identical binding; changing any output, input, transcript, recipient, amount, fee cap, supporting evidence or profile revision changes the binding; reordering semantically unordered profile sets does not; old async hash completion is discarded.
- [ ] Run `npm test -- src/core/reviewBinding.test.ts src/app/workflow.test.ts`; confirm failures.
- [ ] Implement versioned fixed-field canonical encoding, decimal bigint strings, UTF-8 and SHA-256. Hash exact PSBT bytes and sorted evidence hashes; include engine version. Bind receipts to session/revision and full hashes. Display “local review record, not a signed safety certificate.”
- [ ] Run tests, including metadata-only PSBT mutation (conservative invalidation); require pass. Commit `feat: bind review results to exact intent and transaction data`.

## Task 7: Accessible guided review and complete bilingual speech

**Files:** Create `src/app/{IntentReview,TransactionReview}.tsx` and tests; modify App, CSS, report presenter, speech synthesis and tests; add `e2e/review.spec.ts`.

**Interfaces:** `presentReport(report, locale): LocalizedReport` remains the only source of financial readback text. Extend localized reports with structured readback sections for recipient/payment/fee/debit/change/warnings; UI and TTS consume the same fields.

- [ ] Add failing tests for identical financial facts in Hindi/English, MATCH speaking 50,000 payment + 1,000 fee + 51,000 external debit + 9,000 change, every issue code localized, missing Hindi voice, replay/stop, focus after errors and edits, full keyboard flow and document language.
- [ ] Run `npm test -- src/app src/core/reportPresenter.test.ts src/adapters/speechSynthesis.test.ts`; confirm new expectations fail.
- [ ] Implement the guided functional screens and optional teach-back with equivalent keyboard controls. Never rely on colour/audio alone; no custom cursor. Avoid competing live-region and app-speech announcements. Keep full address and output details available.
- [ ] Run unit tests and `npm run test:e2e -- e2e/review.spec.ts`; require no serious/critical axe issues in all report/error states and complete no-microphone path. Commit `feat: add accessible bilingual intent and transaction review`.

## Task 8: Real-world interoperability and release evidence

**Files:** Add `tests/fixtures/interoperability/`, `docs/validation/interop.md`, `docs/validation/accessibility.md`, `docs/demo-script.md`, `.github/workflows/ci.yml`; update README and Playwright configuration as required.

**Interfaces:** Use public app flow and test commands only; no special verifier bypass for demo fixtures.

- [ ] Define an interoperability manifest schema containing wallet version, exact test chain, export steps, fixture hashes, expected input/output/fee totals and provenance. Add a fixture validation test that fails until genuine wallet-exported evidence is supplied. Do not commit private keys or invented exports.
- [ ] Produce an unsigned testnet Sparrow transaction and supporting raw previous transactions; independently check destination/change addresses and import through the UI. Record actual wallet/chain versions, not assumed compatibility. Awaaz does not sign or broadcast.
- [ ] Add E2E cases for wrong destination, 10x amount, extra known/unknown payment, fee above cap, missing evidence and post-review replacement, followed by corrected re-review. Run both genuine and synthetic cases through the same path.
- [ ] Run `npm test`, `npm run build`, `npm run test:e2e` on a clean dependency install and add CI for those commands. Configure a separate installed-Chrome project for the actual demo; bundled Chromium results alone are not proof of Chrome microphone behavior.
- [ ] Record actual Chrome microphone testing, VoiceOver and NVDA checks, and user evaluation results/limitations. Never mark unavailable manual checks passed. Confirm no storage/payment uploads with browser tooling; disclose browser speech-provider traffic separately.
- [ ] Document installation, supported inputs, offline/manual fallback, trust assumptions and recovery steps. Commit `test: document real-wallet and accessibility release evidence` only with truthful results.

## Completion gates and sequencing

Tasks 1-4 make the engine dependable; Tasks 5-7 make the differentiated workflow usable; Task 8 earns a supported-beta claim. Expected engineering effort is approximately 4-6 weeks, contingent on environment and testing access. Independent audit, user recruitment delays and mainnet release are not included.

Acceptance requires every automated gate passing, genuine wallet interoperability evidence, a repeatable microphone-independent path, and explicit recording of manual accessibility/voice results. Any uncompleted release gate is listed as outstanding, not hidden behind passing unit tests.

The demo shows: confirm Riya/50,000/cap 2,000 -> wrong recipient/500,000 warning -> extra payment warning -> excessive fee warning -> corrected transaction -> exact bilingual readback -> edit/replace transaction -> review invalidated. It does not claim transaction broadcasting or adversary-proof security.

Plan self-review: original non-signing scope preserved; all five review risks assigned tests; new interfaces defined; later signer/model/descriptor work explicitly excluded. Only planning documents were written in this turn.

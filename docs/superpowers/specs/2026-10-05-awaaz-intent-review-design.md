# Awaaz: confirmed-intent Bitcoin review

Status: proposed design, not an implemented or audited product. Prepared 2026-10-05.

## Outcome

Build a dependable local, non-signing Bitcoin transaction review companion for Hindi/English-speaking newcomers and people who benefit from audio or screen-reader access. The user confirms what they mean before Awaaz reads a transaction. Awaaz compares every output against that intent, explains discrepancies, and ties the result to the exact reviewed data.

“Completely working” means the supported review workflow works with real wallet-exported testnet PSBTs, not that Awaaz becomes a wallet or is approved for mainnet funds. No signing, broadcasting, private keys, wallet connections, backend accounts, cloud LLMs, automatic persistence, or QR scanning in this release. The latest request is planning only.

## Why this direction

Three approaches were considered:

1. A voice-controlled wallet: convenient, but custody/signing scope expands substantially and direct prior art exists.
2. An independent confirmed-intent review companion: recommended; builds on the existing code and concentrates on understandable transaction review.
3. A second-device signing gate: potentially a stronger trust boundary, but requires signer integration and hardware/transport work. Defer.

Originality is a hypothesis about the combination and target audience, not a claim that its individual mechanisms are new. Current public prior art includes:

- [KaleidoMind](https://github.com/kaleidoswap/kaleido-mind): its README describes voice interaction, structured payment workflows and deterministic confirmation readbacks. Voice plus a confirmation gate is not a unique claim.
- [COLDCARD](https://coldcard.com/docs/ready-to-sign/): PSBT review, fee/change checks and checks for transaction modification already exist. Transaction binding is not a new cryptographic invention.
- [USENIX SOUPS research](https://www.usenix.org/conference/soups2023/presentation/zhou): accessibility research includes iterative wallet design with blind participants. Accessibility itself is not an unexplored category.

The proposed differentiation is a wallet-independent, Hindi/English, intent-first discrepancy explanation workflow with evidence provenance and accessible re-review. Public documentation was reviewed, not every competitor's implementation. No exhaustive prior-art or patent search was performed; no “world first” claim is justified.

## Current baseline and gaps

The repository already contains React/Vite/TypeScript, bitcoinjs-lib 7.0.1, five core/adaptor modules and tests. On 2026-10-05, `npm test` passed 34 tests across 9 files. Build and browser tests were not rerun during this planning audit.

Static inspection found:

- `verificationEngine.ts` checks the first matching recipient and only flags additional outputs classified unknown. Extra outputs to known recipients can be overlooked.
- `intentInterpreter.ts` matches aliases by substring, selects the first amount, and supports only a small phrase vocabulary. Negations and conflicting amounts are not handled safely.
- `App.tsx` edits transcript text independently from the interpreted intent and report. An older result can remain visible after an edit.
- `psbtParser.ts` prefers witness UTXO data without cross-checking a simultaneously supplied non-witness transaction. There is no explicit user fee limit.
- Speech/file operations lack complete reset cancellation, and successful speech reports do not read out all payment facts.

These are planning findings, not a complete security audit.

## Experience

1. Choose Hindi or English; typed input remains available at every point.
2. Configure a recipient address and allowed change addresses independently of the PSBT. The demo profile is visibly marked synthetic.
3. Say or type “Riya ko pachaas hazaar sats bhejo.” Unsupported or ambiguous language asks for correction; never guesses silently.
4. Review recipient, exact amount and a maximum total fee. Default demo suggestion: 2,000 sats, requiring explicit confirmation. Real sessions have no preaccepted fee limit.
5. Confirm the intent. Optional teach-back asks the user to repeat/select the recipient and amount; a keyboard alternative is always available. This is an error-reduction feature, not authentication or proof of understanding.
6. Import a PSBT and, when necessary, supporting previous transactions.
7. Hear and read recipient, payment, fee, total external debit, change, exceptions and limitations. For the corrected demo: payment 50,000 sats, fee 1,000 sats, total external debit 51,000 sats, change 9,000 sats.
8. View a local review receipt. Any change to transcript, profile, fee policy, PSBT or evidence immediately invalidates it. Replacing a transaction requires re-review.

Use MATCH to mean “matches your confirmed instruction under the displayed assumptions,” never “safe to sign.” MISMATCH and INCOMPLETE both say DO NOT SIGN. Awaaz cannot block an independent wallet from signing.

## Architecture and constraints

Retain the existing small modules. Add confirmation, policy, evidence and review-binding modules rather than a backend or a rewrite.

`speech/typing -> intent draft -> explicit confirmation -> PSBT + evidence -> deterministic checks -> bilingual report -> bound review receipt`

- Pin bitcoinjs-lib 7.0.1. Keep bigint for all monetary arithmetic. No signing, key-generation or ECC dependency additions.
- PSBT v0 only; Base64 and binary files; existing 100,000-byte PSBT cap. Supporting previous-transaction files have a 1,000,000-byte individual and 5,000,000-byte session cap. Parse in a cancellable worker; 2-second processing timeout; at most 100 inputs and 100 outputs in this supported release.
- Support native P2WPKH inputs initially. Other input types, non-ALL requested sighashes, signatures/finalized inputs, malformed structure and unsupported versions cannot produce MATCH.
- Fixed testnet address context, as today. Name the concrete test chain in interoperability evidence. PSBTs and testnet-formatted addresses do not establish chain origin; no automatic network-detection claim.
- Single payment recipient per intent. Sum all outputs to the selected script, require the exact requested aggregate amount, and count/list each output. Any other non-zero non-change output fails, including another known contact. Never trust a stored classification without recomputing against the confirmed profile.
- Recipient and change sets must be disjoint. Change scripts come from independently reviewed configuration, never PSBT labels, amount or position. An imported profile is user-supplied evidence, not cryptographically proven ownership; state that limitation.
- Zero-value OP_RETURN is informational. Positive OP_RETURN fails; other unsupported zero-value scripts yield INCOMPLETE.
- Validate every supplied nonWitnessUtxo against its outpoint and cross-check witness values/scripts when both exist. For strict MATCH, require a hash-linked previous transaction for every input, supplied in the PSBT or separately; witness-only values are displayed as claimed and produce INCOMPLETE. This verifies consistency with the outpoint, not chain inclusion, unspentness, ownership or spendability.
- Recompute totals, reject duplicate outpoints, negative/overflow amounts and impossible fees. Money range is 0..2,100,000,000,000,000 sats; payment must be positive. Fee must not exceed the explicitly confirmed absolute cap. Do not invent an exact unsigned fee rate or a current market fee recommendation.
- Display version, locktime and sequences; conservatively return INCOMPLETE for unsupported relative-lock or script semantics. Present supported nonzero absolute locktime and RBF information explicitly during review.
- Keep transcript, profile, evidence and reports in memory. Reset/reload clears them; no analytics, transaction uploads, logs containing payment data, or automatic receipt downloads.
- Browser recognition remains experimental and may send audio to its provider. Disclose before microphone use. Typed verification is independent of recognition and remains usable without a microphone/network after the local app has loaded. Do not promise offline voice. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

## Intent and review contracts

Add a confirmed intent carrying a selected script, positive amount, explicit fee cap and revision. Draft interpretation can never directly reach verification. Exact token/alias matching replaces substring matching. Supported grammar covers digits, Devanagari digits, exact BTC decimals, English number composition through lakh/crore, and an enumerated tested Hindi/Hinglish number lexicon. Multiple amounts, mixed authoritative units, negations/corrections, unsupported language and unknown contacts require correction/confirmation; confidence scores never bypass this.

A review binding includes SHA-256 digests of exact PSBT bytes, supporting evidence, canonical confirmed intent, canonical profile and policy plus schema/engine versions. Canonical encoding specifies field order, decimal strings for bigint, UTF-8 and sorted profile script sets. Preserve transaction output order in the report. Use full hashes for comparison, never short display codes.

The binding is an in-memory consistency mechanism. It is not a signed attestation, timestamp proof, proof of human intent, or protection against a compromised browser/OS. Async parse/hash results must carry session and revision identifiers; stale results are ignored.

## Accessibility and presentation scope

This release includes a guided functional interface, not final branding or cursor animation. Required controls: language, recipient setup, intent editor/readback/confirm, fee cap, PSBT/evidence upload, output ledger, report, replay/stop, and reset. Native pointer, visible focus, semantic labels, non-colour verdicts, reduced motion, proper language tags and full keyboard operation are required. App speech and screen-reader announcements must not compete. Missing Hindi TTS voice yields an honest text fallback.

Do not infer “Indian users” share one literacy level or aesthetic. Final Indian-inspired visual identity remains a separate phase after usability testing, consistent with the earlier request.

## Validation and release boundary

- Regression suite covers the observed gaps, malformed/adversarial PSBTs, exact amount grammar, fee limits, every output, duplicate inputs, evidence conflicts and stale async results.
- Metamorphic tests: output permutation cannot change semantic verdict; increasing fee beyond the cap or adding unapproved value cannot preserve MATCH; any reviewed-data edit invalidates the receipt.
- Desktop Chrome: complete typed and microphone flows, permission denied, unsupported recognition, silence, timeout, upload failure, reset during listening/upload, and report invalidation. Automated speech mocks are separate from actual-device microphone tests.
- Manual VoiceOver and NVDA keyboard/readback checks plus automated accessibility scans in all verdict and error states. If NVDA/Windows is unavailable, record that gap; do not mark it passed.
- Independently produce a public-testnet PSBT in Sparrow, import its actual previous transactions and reviewed destination/change configuration, and verify amounts against Sparrow. Do not fabricate this evidence or broadcast from Awaaz. [Sparrow features](https://sparrowwallet.com/features/)
- Conduct a small formative evaluation with 5-8 consenting target users, including at least 2 screen-reader users if recruiting permits. Measure task completion, comprehension and caught errors; recruitment-dependent work cannot be replaced with invented results.
- Mainnet is not enabled by this plan. It requires a separately reviewed threat model, independent security assessment, stronger profile provenance and a signer integration strategy.

## Delivery estimate and later work

Planning estimate: 4-6 engineering weeks for the supported beta, assuming one experienced developer, test-wallet access and timely feedback; not a guarantee. User recruitment and independent security review may take longer.

Later, separately scoped work: genuine local multilingual semantic-model evaluation, verified watch-only descriptor imports, an integrated signer enforcing review bindings, and an independently trusted second-device mode. No claim these already exist in Awaaz. Core parsing and verdicts must remain deterministic even if a model is added.

# SDD ledger — plan: docs/superpowers/plans/2026-10-05-awaaz-intent-review.md

Plan: docs/superpowers/plans/2026-10-05-awaaz-intent-review.md

Ruling: restore the existing baseline into the user's new empty workspace; do not modify the old repository. This makes the implementation available at the current requested path.
Ruling: the latest request includes final UI and Framer Motion, superseding the plan's visual-design deferral. Use the installed UI/UX Pro Max skill; no additional skill installation is needed.
Ruling: implement inline and keep changes on codex/awaaz-review. External user research and real microphone/screen-reader results cannot be invented; record remaining checks separately from automated verification.

Pre-flight: Tasks 1-3 share confirmed-intent and prevout contracts; define types together and migrate existing tests to explicit confirmation. Tasks 4-7 share session/revision and review-binding contracts; retain one session authority in the reducer.

- Baseline restored; framer-motion and lucide-react installed.
- Tasks 1–7: supported core and guided UI implemented. Current interfaces preserve the five module boundaries, add explicit confirmation/policy and validate previous transactions. Six synthetic scenarios share the normal parser/worker path. Invalidation, profile setup, hash receipts, bilingual text/audio, teach-back, fallback and responsive Framer Motion UI are connected.
- Task 8: automated release evidence and CI implemented. Clean `npm ci` succeeded; no dependency vulnerabilities reported. Public testnet3 previous-transaction fixture passes hash/accounting tests and ordinary UI import. Genuine Sparrow spending export, physical microphone/TTS, VoiceOver/NVDA and participant evaluation remain unverified; therefore supported-beta acceptance is NOT claimed.
- Targeted regressions were observed failing before fixes for extra-recipient authorization, UTXO conflicts, stale confirmations/results, speech abort lifecycle, discarded punctuation, misleading recipient readback and playback completion. The 100-case intent corpus remains checked in.
- Fresh browser verification: `npm run test:e2e` passed 22 cases across installed Chrome and bundled Chromium; `npm run test:e2e:production` passed 11 cases against built assets and the production worker. Serious/critical axe violations: none in tested states. These are browser/mock checks, not human screen-reader or microphone results.
- Final clean-install verification: `npm test` passed 210 tests across 18 files; `npm run format:check` passed; `npm run build` passed; `npm audit --omit=dev` found 0 vulnerabilities. CI workflow is supplied but no remote CI execution has occurred.
- Final browser rerun after the verify-button transition fix: 22/22 Chrome+Chromium development cases and 11/11 production Chromium cases passed. Desktop initial/warning/match and mobile match layouts were inspected from screenshots; the demo server remains running on 127.0.0.1:4173.

## Review decisions

One fresh read-only reviewer checked the implementation, including the five named review risks. No Critical defect was reported. The following findings were reproduced in failing tests and fixed in one pass:

- Leading decimal punctuation was silently discarded. `.0005 BTC` / `.5 BTC` now require a leading-zero rewrite instead of becoming 5 BTC. Regression tests RED→GREEN.
- A fresh production accessibility run caught transient verify-button contrast while its disabled background transitioned to enabled. Removed background interpolation from buttons; regression checks the transition property without adding sleeps or weakening axe scans.
- Extra complete maps after a valid PSBT were accepted by the library. Envelope map count now must exactly match one global + all input + all output maps. Both trailing-map probes RED→GREEN.
- Final: Ruling: spoken trust caveat was graded Minor by the reviewer; regraded Important for audio-first users and fixed. Financial readback now states consistency-only, ownership/chain/unspentness limits and unsigned receipt status; report test RED→GREEN. Cost if wrong: extra spoken length, not hidden financial ambiguity.
- Final: minor (deferred): per-input sequence is retained/checked by the engine but not printed in the input ledger. Version, absolute locktime and RBF are displayed; relative timelocks produce INCOMPLETE. Cost: less detailed transaction debugging, not an unsupported-input MATCH.

Reviewer declined-to-judge rulings:

- Final: Ruling: physical speech and VoiceOver/NVDA behavior cannot be inferred from mocks; keep explicitly unverified. Cost if wrong: recording-device/assistive-technology behavior may differ.
- Final: Ruling: genuine Sparrow export is a release gate, not satisfied by an independently sourced public previous transaction. No existing encrypted wallet was unlocked. Cost if wrong: external wallet compatibility remains unproven.
- Final: Ruling: human comprehension is not established without participants; no user-study claims. Cost if wrong: accessible controls may still need comprehension improvements.
- Final: Ruling: mainnet/profile ownership is outside the supported prototype; keep no mainnet/signing/cryptographic ownership claims. Cost if wrong: the product remains unsuitable for real-fund security decisions.

No remote deployment, repository push, merge, signing, broadcasting or existing-wallet changes were performed. Files remain in the requested workspace on codex/awaaz-review. The old baseline repository is untouched. Build reports an approximately 513 kB main bundle warning; performance splitting is future work, not a suppressed warning.

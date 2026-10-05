# Retro/simple review update — 5 October 2026

## Scope and design decisions

Bounded redesign of the existing local verifier, proceeding under the user's prior instruction to implement without another approval loop. No new signing, wallet connection, mainnet, account, persistence or cloud financial upload. No local Sparrow access.

Used brainstorming and UI/UX skills to select a paper-receipt/tabletop-radio motif: cream, forest green, marigold, large plain text, recognisable code-native pictograms and hard offset borders. Initial design-system search returned unrelated enterprise styling; narrowed the style search to retro analog, retaining modern readability and reduced-motion support instead of film grain, distorted typography or flashing. Framer Motion remains limited to non-financial decoration; verdicts never wait for an animation.

Simple view starts with Tell us → Bring the file → See the result. Only the current task is exposed. Optional context/network checks use native disclosures; Detailed view preserves access to the entire existing workspace and the same completed report. Sound off is an in-memory preference that stops audio and disables all read/microphone controls. Step instructions are the same strings rendered and narrated.

The pictorial receipt separates intended recipient, other payments, fee, total leaving and configured change. It never infers ownership from a change label. Missing input evidence makes fee and debit Unknown even when a PSBT supplies a plausible witness-only value. No rupee conversion or model-generated financial facts.

## Test evidence and independent review

- Initial three simple-view tests observed RED before implementation, then GREEN for English silent mismatch, detailed-view invalidation and Hindi manual receipt.
- Step-transition focus regression observed RED, then GREEN after focusing the newly visible heading.
- Claimed witness-only fee regression observed RED (displayed 1,000 sats), then GREEN after displaying Unknown for evidence-dependent fee/debit.
- One isolated read-only reviewer found no Critical issues, one Important child-operation cancellation gap and one Minor enabled-but-guarded quiet-control inconsistency. No second reviewer dispatched.
- Important finding reproduced for mode changes: question recognition and payment-request QR signals remained un-aborted. Added an interaction epoch and visible-step activity propagation to the independent controllers without remounting or losing unsaved address edits. Late results are rejected and completed financial reports preserved. Unit cases also cover hidden-step question cancellation. Fixed the Minor by disabling intent/answer read buttons when quiet; central playback guard remains.
- The first all-browser run exposed stale old focus expectations and a 30-second total-test timeout under four concurrent workers. Updated the intentional first-Tab expectation to the new view control. Two-worker runs preserve all assertions without increasing the app's two-second verification timeout or hiding failures.
- A redundant unit run overlapping the browser suites exhausted the default five-second test timeout in six UI cases (no assertion failures). Final unit verification was run separately, retaining the existing timeout rather than changing product logic or weakening assertions. Avoid running all jsdom workers alongside full browser suites on this machine.

All reviewed in-scope behaviours were retained and tested. The original, unchanged verifier's independent security assessment remains outside this bounded UI change; this does not relax any testnet/non-signing limit. Real microphone/system voices, screen readers and participant comprehension are manual release gates, not passed by mocks or axe scans.

## Voice and accessibility boundary

Current browser speech and grounded deterministic answers need no API key or backend. Official Gemini Live/Groq research and a future protected-backend architecture are in [voice options](voice-api-options.md); no provider was integrated and no personal audio/transaction was sent. Free-tier pricing, limits and data-use terms are date-sensitive.

Pictograms and speech do not prove comprehension for everyone. Someone who cannot hear and cannot read needs validated Indian Sign Language and target-user testing. No fabricated signing avatar, universal-accessibility or world-first claim.

## Verification status

Fresh unit suite: 260/260. Application build, local ESM SDK build/smoke and formatting passed. Production dependency audit: zero reported vulnerabilities. Main bundle retains a non-blocking 587.74 KB size warning; route splitting is future performance work. Final browser suites: 52/52 development checks across installed Chrome and bundled Chromium; 26/26 production Chromium checks against the built app and worker. Simple mismatch and Hindi/mobile INCOMPLETE states pass all-violation axe scans. Desktop dashboard, simple instruction and real synthetic mismatch screenshots were inspected through Playwright; automated mobile layout checks pass, without a claim of participant comprehension.

Files remain local/uncommitted on the existing unborn branch. No reset, commit, deployment, authentication or provider connection was performed.

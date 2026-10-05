# Awaaz — understand before you sign

A local, memory-only **testnet payment-review prototype**. Say or type a Hindi, English or supported Hinglish Bitcoin instruction; explicitly confirm the recipient, exact sats and maximum fee; import an unsigned PSBT; hear and read deterministic discrepancies before returning to your wallet.

## BOSS Battle: Machine Money

Awaaz targets **Machine Money** as an AI-assisted Bitcoin review companion. Optional OpenAI understands compound questions and conversational follow-ups; Gemini remains a single-question fallback. The local engine supplies financial facts and verdicts, while opt-in public mempool estimates support fee comparisons and confirmation-priority estimates. AI cannot confirm intent, change amounts, authorize a payment or sign.

Suggested prompts and locally recognized safety questions stay local. Separate consent allows OpenAI to interpret other questions using the previous question and topic labels; unsupported topics are declined and provider failure falls back to local understanding. Hindi/English answers and optional narration use local file facts. No transaction is attached to AI or mempool requests. AI requires a configured backend; a static site retains local review and question answering.

Track rationale and ready-to-use submission text: [BOSS Battle submission](docs/boss-battle-submission.md). [Bitshala track overview](https://luma.com/bitshala-bossbattle).

React/TypeScript + Vite, pinned bitcoinjs-lib 7.0.1, Framer Motion, Lucide icons and self-hosted fonts. The original retro payment desk uses warm paper, forest-green ink, marigold controls and a code-native tabletop-radio/receipt illustration. Yatra One supplies hand-painted English/Hindi display lettering; Lora gives English prose a printed-ledger feel, with Noto Sans Devanagari for Hindi prose. Manrope/Noto remain on amounts, controls and critical warnings. Both new font families are pinned at 5.3.0; redistribution notices are in `public/font-licenses/`. Decoration never obscures financial facts. Bitmela inspired thematic consistency only; no assets or layout were copied.

## Site and authentication

- `/`: dashboard with real in-memory session readiness, preparation checklist and guided-demo entry. No fabricated holdings or saved history.
- `/review`: a guided **Tell us → Bring the file → See the result** reviewer. Simple view is the default; **Detailed view** (or `/review?details=1` on first load) exposes the full workspace. All PSBT/evidence/QR imports, exact verdicts, grounded questions and optional fee context remain available.
- `/guide`: the process, verdict meanings and honest trust boundaries.
- `/developers`: experimental SDK integration, build commands and integrator responsibilities.

Native links support deep links, new tabs and browser history. Navigating within the site preserves unchanged completed reviews, but cancels pending decoding/verification/audio. An interrupted review can be retried; edits invalidate the dashboard verdict. Reload/reset clears session data. The guided demo starts a clearly labeled fresh synthetic session (replacing existing desk inputs), with demo addresses, fee policy and a tampered fixture. It never confirms or verifies for the user.

**No account or credentials are needed for local review.** There are no accounts, server-side review storage or wallet connections. Optional AI needs a server API credential. Voice requires explicit consent and optional browser microphone permission. Public fee estimates remain opt-in and need no API key. Site explanation pages support English/Hindi; review language is an explicit control because changing it invalidates confirmed intent.

## Grant-companion additions

- Optional payment purpose, familiarity and independent-channel check. Urgency/new-recipient prompts are transparent rules, **not AI fraud detection**. They never change the deterministic verdict.
- Ask or speak about the readable file or current review: payments, fees, confirmation estimates, change, unusual details and limits. Optional OpenAI understands compound questions and follow-ups. Financial answers remain local; unsupported questions abstain.
- Decode payment-request or single-frame Base64 PSBT QR images locally (PNG/JPEG/WebP, 5 MB). Request labels/messages remain untrusted; addresses require a separate review before saving. No camera or URI fetching; animated UR/BBQR and BIP353/DNSSEC resolution are not implemented.
- Explicitly request public testnet3 fee estimates from mempool.space, with source/time/five-minute freshness and an eight-second timeout. No transaction, address, transcript or purpose is sent. Complete supported P2WPKH evidence permits an estimated signed size and fee rate; actual signature sizes are not yet known. PSBT chain origin remains unknown. Confirmation brackets are heuristics, not settlement guarantees. Network context never changes the verification verdict.
- [Experimental reusable ESM SDK](docs/sdk.md): pure engine exports and TypeScript declarations, no UI, wallet or network adapters.

No local Sparrow wallet, app or configuration is accessed for these changes. Public testnet evidence, synthetic fixtures and the SDK smoke test provide wallet-independent demo facilities, not proof of external-wallet interoperability.

## Start

Node 22 or newer is required.

```bash
npm ci
npm run dev -- --host 127.0.0.1
```

Open the printed localhost URL in desktop Chrome. On the current machine the demo is running at [http://127.0.0.1:4173](http://127.0.0.1:4173).

1. On the dashboard choose **Review a payment**, then **Use demo phrase**, or consent to browser speech and speak an instruction. **Try the guided demo** stages the same phrase plus the tampered fixture, without confirming it.
2. Review the recipient/address, 50,000 sats and fee limit; choose **Confirm payment intent**.
3. Load **Wrong recipient · 10×** and **Verify transaction**. See recipient and amount discrepancies.
4. Choose step **2 Bring the file**, load **Correct payment** and verify again: payment 50,000, fee 1,000, debit 51,000, configured change 9,000 sats.
5. Explore extra-payment, high-fee, missing-evidence and split-payment scenarios, Hindi reports, teach-back and output/hash details.
   Expand **More checks (optional)** to add a payment purpose before confirming, then try **Does anything look unusual?** and **How much leaves my wallet?** after review. Return to step 2 to replace the file, or use Detailed view to see everything together.
6. Edit any reviewed information: the result clears immediately. Reset/reload clears all data.

Speech is optional and experimental. Recognition may use a browser provider, not necessarily local processing. Microphone denial, silence, timeouts or unsupported recognition have an editable transcript and preset fallback. TTS needs a matching installed system voice; missing voices fall back honestly to text. Playback is optional, replayable and stoppable.

**Hear this step** reads its visible guidance; **Sound off** cancels speech, disables microphone consent and automatic/read-report playback. The pictorial receipt separates the intended recipient, other payments, fee, total leaving and configured change. Fees with missing input evidence are Unknown, not verified claims. Warnings use text and symbols, not colour or hearing alone. Deaf users who also cannot read still need validated sign-language guidance and target-user testing; the app does not claim universal accessibility.

## Conversational transaction assistant

Import a readable unsigned PSBT and ask **What am I signing?**, **Is this fee too high?**, **How long will it take to confirm?**, or **Can I pay less if I wait?** In **Conversation and network settings**, choose **OpenAI** and allow question understanding. It receives the current question, previous question, topic labels and language, never attached transaction facts. Awaaz builds financial answers locally. Suggested prompts stay local. Enable public mempool estimates separately for fee comparisons and timing; no mempool API key is required. Explanation does not confirm payment intent or approve signing.

Set server-only `OPENAI_API_KEY` in `.env.local` (see `.env.example`), with optional `OPENAI_CONVERSATION_MODEL` (default `gpt-4.1-mini`), then restart Vite. Never expose the key through a `VITE_*` variable or browser input. Local and Vercel endpoints are included. No live OpenAI call or validation was run for this update. [Customer flow and limits](docs/conversational-review.md).

Gemini remains a single-question fallback for wording the local router cannot understand. Only that question and language go to Google. [Voice architecture and limits](docs/voice-api-options.md).

For local Gemini access, copy `.env.example` to `.env.local` and set server-only `GEMINI_API_KEY` to a restricted Google AI Studio credential. Restart Vite if necessary. Never use a `VITE_*` key or commit environment files; rotate any key pasted into chat. Dev and preview provide a loopback-only, same-origin endpoint with request-size, concurrency, rate and timeout limits. A static deployment has no Gemini backend, and the Vite middleware must not be treated as a public production server. Google account/model quota and data-use terms apply; availability and a free tier are not guaranteed.

## Deploy (Vercel)

`vercel.json` builds the Vite app to `dist/` and rewrites deep links (`/review`, `/guide`, …) to `index.html`. The `api/` folder holds small serverless functions that keep API keys on the server:

- `api/ai/intent`: understands a free-form instruction (contact and exact amount), which the exact parser then re-checks.
- `api/ai/review`: the AI situation check. It returns go / pause / block plus an explanation. The AI can only make the final verdict stricter, and its text is shown only if it passes the Number Lock.
- `api/ai/transcribe` and `api/ai/speak`: OpenAI speech-to-text and text-to-speech.
- `api/openai/conversation`: maps a review question to local answer topics; Awaaz builds the answer itself from the verified facts.
- `api/gemini/question`: the optional legacy question classifier.

Set these in Vercel → Project → Settings → Environment Variables (Production and Preview), then redeploy:

| Variable | Required | Default |
|---|---|---|
| `OPENAI_API_KEY` | yes, for AI features | — |
| `OPENAI_MODEL` | no | `gpt-6-luna` |
| `OPENAI_TRANSCRIBE_MODEL` | no | `gpt-4o-mini-transcribe` |
| `OPENAI_TTS_MODEL` | no | `gpt-4o-mini-tts` |
| `OPENAI_TTS_VOICE` | no | `marin` |
| `OPENAI_CONVERSATION_MODEL` | no | `gpt-4.1-mini` |
| `GEMINI_API_KEY` | no | — |

Locally, put the same variables in `.env.local`; never use a `VITE_` prefix. Rate limits apply per function instance, so also set a monthly usage limit in the OpenAI dashboard. Without a key, Awaaz falls back to the code-only check and browser speech. Add `?lockdemo=1` to the review URL to see the Number Lock reject a planted wrong number.

## Supported inputs and trust boundary

- Unsigned BIP174 PSBT v0 as binary `.psbt`, text Base64 `.psbt`, or pasted canonical Base64; decoded PSBT limit 100,000 bytes, maximum 100 inputs and 100 outputs.
- Native P2WPKH inputs; SIGHASH_ALL only; no signed/finalized inputs or relative timelocks. Unsupported semantics cannot yield MATCH.
- Hash-linked previous transactions are required for every input. Supply them embedded as `nonWitnessUtxo` or upload raw binary/hex files (1 MB each, 5 MB total). Witness-only values are labeled claimed and yield INCOMPLETE.
- Sats/satoshis and BTC are authoritative. Amounts use bigint, exact decimals, Devanagari digits and a tested enumerated Hindi/Hinglish number grammar. Unsupported language, corrections, negation, currency symbols, multiple amounts and ambiguous number forms require editing; no LLM guessing.
- Testnet-format recipient/change addresses must be configured and reviewed independently. Demo addresses are synthetic. Custom profiles require explicit review and a new fee limit. Only exact configured scripts count as change; a known additional contact is not an authorized payment.
- MATCH means consistency with the confirmed intent, complete supported facts and fee cap. It is **not safe-to-sign certification**. MISMATCH and INCOMPLETE both say DO NOT SIGN.
- PSBTs do not reliably encode their chain origin. The app uses a fixed testnet address context, not mainnet detection. Hash-linked evidence does not prove ownership, chain inclusion, unspentness or spendability.
- Full SHA-256 bindings tie the review to transaction bytes, evidence, intent and profile. Local receipts are unsigned consistency records, not tamper-proof attestations or signer enforcement.
- No Bitcoin private keys, signing, broadcasting, wallet connections, accounts, analytics, persistent review storage or automatic transaction uploads. Optional browser speech, public fee requests and consented OpenAI/Gemini question understanding may contact external services. API credentials stay on the server; financial verification is never delegated to AI. No production-security or world-first claim.

## Architecture

Five independent responsibilities: SpeechRecognizer, IntentInterpreter, PsbtParser, VerificationEngine and ReportPresenter. Pure core modules add explicit confirmation, reviewed address profiles, prevout evidence, fee policy and versioned review bindings. A cancellable worker limits parsing to two seconds. A session/revision reducer rejects stale speech, file and worker results; edits cancel operations and stop speech.

The route shell receives only intent/transaction readiness booleans and the current verdict. The review owns financial data and remains mounted after first opening; a lifecycle suspension cancels work without discarding unchanged finished facts.

`draft → explicit confirmation → PSBT + evidence → bounded deterministic review → MATCH / MISMATCH / INCOMPLETE`

Review data stays in browser memory. Opted-in Gemini requests include question text and language; OpenAI requests additionally include the previous question and topic labels. Do not include private information in questions. AI endpoints do not log or store questions; provider retention follows their policies. Self-hosted fonts avoid third-party font requests. Typed local review works without microphone/provider access after the app loads; this is not an installed offline PWA.

## Verify

```bash
npx playwright install chromium
npm test
npm run build
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=chrome  # requires installed Google Chrome
npm run test:e2e:production          # build first; verifies the actual dist/ worker
npm run format:check
npm run build:sdk
npm run test:sdk
```

CI runs unit tests, build, Chromium development and production flows. Tests cover financial accounting, unsafe extra outputs, fee caps, evidence conflicts, malformed/framing inputs, exact grammar, confirmation, review binding and stale-result cancellation. Browser flows include no-microphone fallback, Hindi, upload/paste/evidence, speech callback simulations, teach-back, mobile/reduced motion, axe scans and memory/no-upload observations.

The independent public-prevout fixture validates real previous-transaction bytes from testnet3. It is not a funded Awaaz wallet or a Sparrow-exported transaction.

## Demo and release evidence

See [demo script](docs/demo-script.md), [interoperability evidence](docs/validation/interop.md), [accessibility/speech evidence](docs/validation/accessibility.md), and [implementation decisions](docs/implementation-progress.md).

External-wallet export supplied independently, physical microphone/TTS, VoiceOver/NVDA and target-user evaluation remain release gates. Do not access the user's local Sparrow to perform them. Automated checks do not replace those manual checks or an independent security assessment. The SDK/licensing direction is an integration model, not a shipped subscription/payment service.

Whole-site implementation and verification evidence: [dashboard progress](docs/site-dashboard-progress.md).

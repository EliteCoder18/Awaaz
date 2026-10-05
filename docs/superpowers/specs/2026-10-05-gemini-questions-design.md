# Optional Gemini question understanding

The user supplied a Google credential and asked to use Gemini. Authentication was accepted by Google's read-only model-list endpoint; no transaction or microphone data was submitted. Preserve the current retro UI, keyless fallback and deterministic verification. This first integration uses Gemini to classify natural English/Hindi questions, not Gemini Live audio or unconstrained financial advice. Browser recognition and system narration remain the voice layers.

## Boundary

- Gemini returns one of recipient, amount, fee, debit, change, unusual, limits or unsupported. Only locally generated answers are displayed and spoken. It cannot supply amounts, verdicts, instructions, signing or broadcasting.
- Ask about safety/identity/signing through the limits category. Reject malformed provider output and extra keys. Never substitute an AI answer for the report.
- Cloud consent is separate from microphone consent, off by default and memory-only. Clearly disclose that question text goes to Google; PSBTs, addresses from the review, report facts and payment transcripts are not included. Warn users not to include private data in questions. Google free-tier data-use terms apply; no free/quota guarantee.
- Consent withdrawal, question editing, reset, locale/review changes, hidden-step transitions, navigation and Sound off cancel pending work. Late callbacks cannot restore old answers. Provider errors visibly fall back to the existing local question router. Suggested questions remain local.

## Local server

Use Vite dev/preview middleware for a local-only POST /api/gemini/question. This is not a deployment backend. Accept only loopback clients and an Origin exactly matching a loopback Host, JSON with exactly question and locale, question length 1–300 characters and at most 2,048 body bytes. Limit to 10 calls/minute per server process and two concurrent calls. Each provider call times out after 15 seconds and aborts when the client disconnects. Cache neither questions nor replies; log no provider error bodies or credentials.

Use Google's generateContent REST API, pinned model gemini-3.5-flash-lite, structured category-only JSON and minimal output tokens. The older 2.5 model appeared in the model list but was denied to new users during live validation; Google's error named this replacement, and live English/Hindi calls succeeded. Keep GEMINI_API_KEY on the server in an ignored .env.local, never VITE_* or a browser variable. Preserve existing environment files. Include a secret-free .env.example and a rotation warning. No new runtime dependency is needed.

## Acceptance

Test origin/method/body/quota/credential controls, provider failure and invalid responses, cancellation, exact deterministic answers and cloud-consent withdrawal. Inspect browser requests for data minimization and local fallback. Perform a live synthetic English/Hindi classification only, report account/quota failures honestly, run full unit/browser/build/SDK checks, and inspect the built assets for credential leakage without printing the secret.

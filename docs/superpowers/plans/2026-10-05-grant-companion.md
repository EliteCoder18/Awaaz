# Grant Companion Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline and test-driven-development. The user explicitly requested implementation without repeated approval prompts.

**Goal:** Make Awaaz a purpose-aware, conversational and QR-accessible non-signing review companion.
**Architecture:** Add independent contextual/request/question modules consumed by the existing state reducer and review facts; retain worker-based deterministic verification.
**Tech Stack:** Existing React/TypeScript/Framer Motion/bitcoinjs-lib 7.0.1; jsQR 1.4.0, QRCode test-only generator, Vite ESM SDK build.
**Spec:** docs/superpowers/specs/2026-10-05-grant-companion-design.md

## Global constraints

No local Sparrow wallet access, keys, signing, broadcasting or wallet connections. Testnet format only. Context advisory, QR labels untrusted. Eight-second fee fetch timeout, source/timestamp, no financial-data uploads. Existing 100KB PSBT and strict evidence/verdict bounds unchanged.

## Review focus

1. A matching transaction with urgent/new-recipient context must not be announced as proven safe.
2. A QR label cannot prove identity or auto-confirm a recipient.
3. Context edits/reset must discard old financial answers and review bindings.
4. Fee provider failure or chain ambiguity cannot change a deterministic verdict.
5. Unsupported questions and URI required parameters must abstain/reject rather than fabricate/fetch.

## Task 1 — Pure context, request and conversation contracts

Files: src/core/{paymentContext,paymentRequest,reviewConversation}.ts and tests; types/reviewBinding/workflow.
Interfaces: PaymentContext {purpose,relationship,independentlyVerified}; assessPaymentContext(context,locale): ContextNotice[]; parsePaymentRequest(string): PaymentRequest; answerReviewQuestion(question,result,context,locale): ReviewAnswer. ConfirmedIntent.context optional; hash includes exact context fields.

- [x] Write/run failing tests for contextual hints versus verdict, URI exact sats/testnet/checksum/duplicate/req parameters, grounded English/Hindi questions and missing facts, context hash mutation and reducer invalidation.
- [x] Implement modules and context integration. Run targeted tests then full unit suite; all pass.

## Task 2 — Local QR and opt-in network adapters

Files: src/adapters/{qrImage,feeContext}.ts; app/{QrImport,PaymentContextForm,ReviewConversation,NetworkContext}.tsx; WalletProfileEditor/App integrations.
Interfaces: decodeQrImage(File,AbortSignal):Promise<string>; fetchFeeContext(AbortSignal):Promise<FeeContext>. QrImport stages decoded requests; save remains independently confirmed. All async work cancelled on reset/unmount, stale responses discarded.

- [x] Add failing browser tests for local actual QR-image staging, no automatic save, contextual answer, context edit clearing report and opt-in fee response/failure; cover unsupported URI with pure-module tests and reset cancellation with adapter/UI regressions.
- [x] Install pinned QR dependency, implement adapters/components and bilingual states. Run no-microphone and all new flows.

## Task 3 — Editorial UI and reusable SDK

Files: app/App.tsx, companion.css; src/sdk/index.ts; vite.sdk.config.ts; docs/sdk.md; README/demo/validation.

- [x] Build bespoke review-desk hierarchy and Q&A interface without removing diagnostic facts/fallback.
- [x] Export pure core entry point; add library build plus Node import smoke with real synthetic PSBT and explicit confirmation.
- [x] Run npm test, app and SDK builds, SDK smoke, all development and production browser flows, axe checks, mobile/reduced-motion/keyboard checks. Inspect real screenshots.
- [x] Fresh read-only final reviewer checks the five review focus risks; reproduce and fix Important findings with regressions. Record honest release gaps and changes; do not access Sparrow.

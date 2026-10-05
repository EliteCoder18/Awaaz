# Themed Site Dashboard Implementation Plan

> Use superpowers:executing-plans inline and test-driven-development. User explicitly requested implementation without repeated approval questions.

**Goal:** Deliver a cohesive dashboard and dedicated functional payment-review site.
**Architecture:** Small client-side route shell and focused dashboard/guide/developer components wrap the existing App verifier. Extend only lifecycle/embedding interfaces, not core verification.
**Tech Stack:** Existing React/TypeScript/Vite/Framer Motion/Lucide; no new dependencies.
**Spec:** docs/superpowers/specs/2026-10-05-site-dashboard-design.md

## Global constraints

Memory only; testnet; no local Sparrow, auth, signing, keys, broadcasting, persistence, upload or publication. Preserve exact accounting and existing failure verdicts. No fake holdings/history. 44px controls, readable contrast, keyboard/deep links/back, reduced motion. Do not fade safety facts.

## Review focus

1. Browser back/forward/deep-link must choose correct page and not lose unchanged review.
2. Leaving the review must cancel QR, worker and speech and leave interrupted states retryable.
3. Synthetic demo navigation must never confirm or verify automatically.
4. Dashboard must not retain a stale MATCH after transcript/transaction/context/reset changes.
5. Sidebar/mobile navigation and route focus must remain usable at 375px and keyboard-only.

## Task 1: Route and session lifecycle

Files: src/app/site/{Site,Dashboard,InfoPages}.tsx; App.tsx/workflow.ts; main.tsx; site tests.
Interfaces: App props embedded?:boolean, active?:boolean, demoRequest?:number, onSession?:(s:SessionOverview)=>void. SessionOverview has hasIntent:boolean, hasTransaction:boolean, verdict?:VerificationReport['verdict']; no PSBT/transcript exported to shell. Site route union dashboard/review/guide/developers/notfound; real href/path links plus history listener.

- [x] Write failing Site UI tests for dashboard CTA, deep linking, guide/back, demo without confirmation, state retention, cancellation, stale dashboard status and unknown paths; run and observe failures.
- [x] Implement route shell/pure route mapping and App embedded/session hooks; preserve in-memory review and cancel hidden operations, add SUSPEND workflow event for interrupted work. Run targeted tests; expect all pass.

## Task 2: Whole-site theme and real pages

Files: site/theme.css, Dashboard.tsx, InfoPages.tsx, Site.tsx; original e2e files now target /review; new e2e/site.spec.ts.

- [x] Add failing browser tests for dashboard→real review, all navigation/back/refresh, synthetic demo, responsive/accessibility/focus and state continuation; observe RED.
- [x] Implement cohesive plum/paper/saffron ledger theme, custom code-native voice→facts visual, contextual sidebar, actual guides/developer copy, compact review workspace. Use existing engine without mocks in browser. Run site browser tests and old flows; expect all pass.
- [x] Run all unit tests, app/SDK builds and smoke, complete dev/production browser suites, formatting; inspect real desktop/mobile screenshots.
- [x] One fresh-context read-only reviewer checks five risks. Fix Important/Critical findings with RED→GREEN tests and full suite. Update docs/auth boundaries and local handoff, no merge/publish.

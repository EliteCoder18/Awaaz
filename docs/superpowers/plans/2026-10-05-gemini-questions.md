# Gemini Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add opt-in Gemini question understanding without delegating Bitcoin facts or safety verdicts to an LLM.

**Architecture:** A loopback-only Vite middleware holds the server credential and returns a validated question category. React resolves that category against the current deterministic report and uses existing browser speech for optional narration. Existing keyless routes remain the fallback.

**Tech Stack:** TypeScript, Node HTTP/fetch, Vite, React, Vitest, Playwright. No new runtime dependency.

**Spec:** docs/superpowers/specs/2026-10-05-gemini-questions-design.md

## Global Constraints

- No signing, broadcasting, production deployment or mainnet claim.
- POST /api/gemini/question; exactly question (1–300 characters) and locale (en-IN/hi-IN); maximum 2,048 bytes.
- 10 calls/minute per server process; two concurrent requests; 15-second upstream timeout.
- Gemini model gemini-3.5-flash-lite; category-only output; no financial facts uploaded.
- Cloud consent off by default. Cancel on all context changes and retain keyless fallback.
- Preserve the existing unborn codex branch and all untracked work; do not commit, migrate worktrees or publish.

## Review Focus

- Extra/malicious model output must not become a payment answer (Task 1).
- Same-origin requests from a non-loopback host must not use the key (Task 1).
- A late reply after consent withdrawal must not revive an answer (Task 2).
- Sound off/locale edits while a request is pending must cancel it (Task 2).
- User-written questions may contain sensitive text; consent must explicitly disclose the upload, not imply all questions are redacted (Task 2).

### Task 1: Secure local question router

**Files:** server/gemini.ts, server/geminiPlugin.ts, src/core/questionCategories.ts, src/core/reviewConversation.ts, src/adapters/geminiQuestions.ts, src/adapters/geminiServer.test.ts, src/adapters/geminiQuestions.test.ts, vite.config.ts, tsconfig.node.json, .gitignore, .env.example.

**Interfaces:** createGeminiMiddleware({apiKey?, fetcher?, now?}) returns a Node request handler; classifyQuestion(question, locale, apiKey, signal, fetcher?) returns Promise<QuestionCategory>; routeGeminiQuestion(question, locale, signal, fetcher?) returns Promise<QuestionCategory>; answerReviewCategory(category, result, context, locale) returns ReviewAnswer.

- [x] Write failing tests: successful category-only routing; extra fields, bad categories and provider errors rejected; real HTTP rejects hostile origins/methods/oversized bodies/extra request fields/missing key; eleventh request is limited; cancelled client request aborts upstream.
- [x] Run npm test -- src/adapters/geminiServer.test.ts src/adapters/geminiQuestions.test.ts; expected RED from absent new interfaces.
- [x] Implement interfaces and strict validation; register dev/preview middleware, ignore environment files before storing the supplied local-only credential with mode 600. Do not replace an existing .env.local.
- [x] Run targeted tests then npm test; expected all passing.

### Task 2: Opt-in interface and stale-answer protection

**Files:** src/app/ReviewConversation.tsx, src/app/companion.css, e2e/gemini.spec.ts, README.md, docs/voice-api-options.md, docs/gemini-progress.md.

**Consumes:** routeGeminiQuestion and answerReviewCategory from Task 1. Suggested buttons use the local router regardless of cloud consent.

- [x] Write browser tests for explicit consent, category-derived exact fee answer, malformed/provider-error local fallback, late answer after consent withdrawal, editing and Sound off, and Hindi/mobile accessible controls.
- [x] Run npx playwright test e2e/gemini.spec.ts --project=chromium --workers=1; expected RED from missing consent control.
- [x] Implement bilingual consent, busy/cancel/error states and source label; upload only the typed question and locale. Abort before every invalidation and clear affected answers. Use existing onRead for narration; no cloud audio claim.
- [x] Run targeted tests and full suites; expected zero failures, production build and SDK smoke passing.
- [x] Make live synthetic English/Hindi calls via the local endpoint; record results without credentials. Check ignored secret, bundle leakage and responsive screenshot. Request one fresh security/behavior review; fix important findings with RED→GREEN tests. Leave all work local and uncommitted.

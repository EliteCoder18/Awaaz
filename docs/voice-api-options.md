# Voice options for Awaaz

Researched against official documentation on 5 October 2026. An optional Gemini text-question classifier is now integrated through a protected local-only server, using a credential supplied by the user. Live synthetic English/Hindi questions succeeded. No PSBT, review facts, payment transcript or microphone audio was sent to Google during validation. Browser speech may independently use a browser provider.

## Recommended now: keep the demo keyless

The current app uses browser speech recognition and speech synthesis, plus deterministic question answering from the reviewed transaction. The keyless path needs no Awaaz backend, paid API subscription or account. Optional cloud-question understanding uses the local Vite server and Gemini 3.5 Flash-Lite; the model only selects an allowed category, while financial answers stay deterministic. Recognized and suggested questions stay local even with cloud assistance enabled; only questions the local router cannot understand are eligible for the consented Gemini request. Cloud consent is separate from microphone consent. Never include private information in a cloud question. This is not a general conversational LLM or Gemini-generated speech. Recognition may use the browser provider; speech voices and availability depend on the device. Manual entry, preset instructions, visible guidance and Sound off remain first-class paths. [Web Speech documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), [Gemini model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

## Current conversational transaction flow

The transaction assistant now also supports optional OpenAI compound-question understanding and one-turn follow-ups, opt-in mempool fee comparisons and confirmation-priority estimates immediately after file import. It receives question text, previous question, previous topic labels and language; financial answers remain local. Set server-only `OPENAI_API_KEY`, choose OpenAI in conversation settings and consent to question understanding. See [the current customer flow, setup and limits](conversational-review.md). Gemini remains a single-question fallback. No new live API calls or runtime validation were performed for this update.

## Recommended next experiment: Gemini Live

Gemini Live supports real-time voice conversation, interruption and input/output transcripts. Its pricing currently lists free-tier input/output for selected Live models, with limited access; free content is used to improve Google's products. Start with synthetic transactions only. Hindi is documented in supported Live speech configurations; confirm the chosen model and account's actual limits before integration. [Live API](https://ai.google.dev/gemini-api/docs/live-api), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [speech language specifications](https://firebase.google.com/docs/ai-logic/live-api/limits-and-specs?hl=en).

An integration would need a Google AI Studio API credential kept on a small backend. For direct browser sessions, mint short-lived ephemeral tokens rather than embedding the standard key in client code. [Recommended connection approaches](https://ai.google.dev/gemini-api/docs/live-api#choose-an-implementation-approach).

## Alternative: Groq Whisper for transcription

Groq documents multilingual Whisper transcription and free-plan rate limits. It is a speech-to-text component, not a complete Siri-like agent. Pair transcription with Awaaz's deterministic explanations and system TTS. Groq's documented Orpheus TTS models are English and Saudi Arabic, so do not assume Hindi playback from them. Account limits must be checked in the console. [Speech-to-text](https://console.groq.com/docs/speech-to-text), [rate limits](https://console.groq.com/docs/rate-limits), [text-to-speech](https://console.groq.com/docs/text-to-speech).

## Proposed architecture, not implemented

1. Explicit consent for cloud audio and minimal, redacted review facts; do not send PSBTs, addresses, keys or unrelated payment-purpose text by default.
2. A protected backend token endpoint with origin checks, quotas, short sessions and no financial/audio logging. Keep provider secrets out of `VITE_*` variables and browser bundles. Local development can use a server environment variable; public access needs abuse protection, not necessarily a user account.
3. Pin the conversation to a frozen review revision. Cancel it on edit, reset, navigation or Sound off. Late answers cannot revive a previous verdict.
4. Let the model handle conversational turns or select supported question categories. The pure verifier owns recipient, exact bigint amounts, fee, verdict and warnings. The model cannot confirm intent, approve signing or change transaction facts.
5. Render and read authoritative financial answers from the same deterministic report. General free-form model audio must not replace this narration: hallucinated numbers or reassurance could otherwise bypass the intended safety boundary.
6. Keep every warning visible. Provider failure falls back to manual review; it must never become a MATCH. No autoplay, listening without consent, signing or broadcasting.

## Deaf and low-literacy inclusion

Speech helps some people who cannot read; it is not a deaf-accessibility solution. Pictograms, exact numerals and written captions help many deaf users, but cannot establish comprehension for someone who cannot hear and cannot read. A later phase needs consented testing with intended users and human-validated Indian Sign Language guidance. No fabricated signing avatar or claim of universal accessibility is included.

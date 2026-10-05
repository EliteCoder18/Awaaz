# Accessibility and speech validation

The retro/simple-view update adds three large pictorial step controls, step narration using the same visible caption, a Sound off preference and a payment receipt separating the intended recipient from every additional payment. Step transitions move keyboard focus to the newly visible heading. Detailed view preserves the same review rather than recomputing or granting approval. Missing input evidence makes fee/total Unknown in the simple receipt. Optional context and network controls use native disclosures.

This design is intended to lower reading and hearing barriers, not prove it has removed them. A person who cannot hear and cannot read needs human-validated sign-language support and participant testing; no Indian Sign Language content or avatar is implemented. No general cloud agent is integrated. See [voice options](../voice-api-options.md).

Automated Chrome and bundled Chromium browser tests cover English/Hindi controls, HTML language, exact labels, keyboard-only confirmation/review, visible report states, mobile 375px layout, reduced motion and axe serious/critical violations in initial, MATCH, MISMATCH, INCOMPLETE and import-error states. These tests are not a formal accessibility certification.

Speech-adapter tests cover recognition results, microphone denial, unsupported recognition, silence, timeouts, synchronous end during abort, reset/late callback rejection and start failure. Browser tests simulate speech callbacks and verify the normal confirmation flow, identical warning text in TTS, replay, stop and completion status. These are mocks, not a recording of a physical microphone or a guarantee about Chrome's speech-provider availability.

Real microphone recognition, real English/Hindi playback, VoiceOver, NVDA/Windows and participant comprehension checks remain **unverified**. No consenting user-study participants were recruited. Before release, test the demo on the recording machine and conduct the target-user accessibility checks in the design specification.

The app requires explicit consent before starting recognition. Audio may be processed by a browser-provider service; voice is not promised offline/local. Missing language-compatible TTS voices produce a text fallback. Financial warnings never rely on colour or sound alone, have no delayed fade-in, and optional autoplay is off by default to avoid competing with screen-reader announcements.

The no-microphone/manual transaction path has no automatic external HTTP requests, localStorage/sessionStorage entries or cookies; reload clears instruction, purpose and verdict. Opt-in browser speech services may be outside page request interception. Opt-in fee estimates make one public mempool.space testnet3 request without financial/personal payload. The app has no analytics/backend and makes no transaction uploads.

Grant companion tests also scan purpose/Q&A answers and staged QR recipient forms with axe. Local image-decoding tests generate actual QR PNGs. Context edits and failed replacement QR imports invalidate old financial reports. These automated checks do not certify target-user comprehension or physical speech accessibility.

The dashboard/site suite checks route heading focus, functional skip-link focus, deep links, back navigation, unknown-page recovery, guided-demo confirmation boundaries, dashboard readiness and English/Hindi mobile/reduced-motion navigation. Unit integration tests cover leaving the review during transaction QR, payment-request QR, worker and recognition operations. The unchanged completed result stays available on return; delayed aborted results cannot restore a MATCH. Separate site and review language controls keep payment-language changes explicit.

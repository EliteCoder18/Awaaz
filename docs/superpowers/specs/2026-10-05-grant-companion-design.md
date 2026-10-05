# Awaaz grant companion — design

Source: user-authorized reading of “Hackathon Grant Strategy”. Implement the relevant product direction, not its document-formatting/biography edits. No local Sparrow access, signing, wallet access, private keys or broadcasting.

Outcome: wallet-independent, accessible conversation about a confirmed unsigned testnet transaction. Recipient/amount/policy stay deterministic. Purpose, urgency, recipient familiarity and independent identity checking become separate user-declared context, bound into the review intent. Contextual hints are advisory, never proof of fraud or a replacement for verification.

Architecture: retain existing core/worker/revision reducer. Add paymentContext, paymentRequest, reviewConversation and feeContext modules; QR image adapter; question/context/QR UI components; src/sdk/index.ts export surface and Vite library build. Context edits invalidate confirmation and report. Questions use current report facts only and abstain on unsupported queries; no free-form model invents financial facts.

QR: decode uploaded images locally (jsQR); accept a checksum-valid public testnet address or constrained bitcoin URI with exact BTC amount. Reject malformed encoding, duplicate keys, unsupported required parameters, mainnet addresses and excess data. QR labels/messages are untrusted; names are not identities. Stage a request into editable contact fields; save requires independent confirmation. A QR may also carry a single Base64 PSBT through the transaction import path. No animated UR/BBQR or BIP353/DNSSEC implementation claim; never resolve/fetch URI links automatically. No camera permission is needed for image import.

Fee context: user-initiated read-only mempool.space testnet fee endpoint, eight-second timeout, no transaction/address/transcript sent. Show source, chain and timestamp. Estimates (sat/vB) are informational; no exact unsigned size/fee-rate claim and no change to the user-confirmed absolute fee cap/verdict. Network failure/stale data must be visible. Core and QR imports remain offline after loading.

UI: a bespoke editorial review desk, cream/ink/vermilion, oversized short title and thin ruled sections, prominent complete financial facts and semantic questions. No generic gradient hero/bento cards/mascot/custom cursor. Original waveform identity remains. Self-hosted bilingual typography, 16px body, visible focus, >=44px targets, reduced motion. Primary actions and old keyboard fallback remain accessible.

SDK: locally buildable reusable ESM library exposing current pure core plus contextual/request/conversation utilities; bigint remains supported; no signing, billing, subscription, remote deployment or production-certified SDK claims. Document integration and proposed annual-support business model as a strategy, not a functioning checkout.

Validation: keep 210 existing tests and browser flows; add context hash/invalidation, contextual risk boundaries, strict URI parsing and QR trust staging, actual generated-QR image import, report-grounded bilingual Q&A, opt-in fee success/failure, SDK built-import smoke. Automated physical speech/screen-reader limitations remain explicit. Public fixture/provider tests replace wallet-local checks; no assertion of genuine third-party wallet export.

Ruling: proceed inline under the user's earlier explicit instruction not to ask again; the latest message authorizes adapting the referenced recommendations. This skips repeated approval gates, not tests or trust-boundary checks. No external financial action is authorized.

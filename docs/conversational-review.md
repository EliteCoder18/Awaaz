# Conversational transaction review

Awaaz lets someone bring the unsigned PSBT they plan to sign and ask normal questions before performing an intent comparison. The assistant explains file facts; it never treats a conversation as payment authorization.

## Customer flow

1. Open `/review`, import an unsigned PSBT and any required previous-transaction evidence. The default file-first flow displays the assistant below the file explanation.
2. Ask “What am I signing?” or “Who gets paid?” The local path needs no model credential.
3. In **Conversation and network settings**, choose **OpenAI**, then explicitly allow question understanding. Now ask “Is this expensive and when will it arrive?”, followed by “What if I can wait?” OpenAI interprets topics using the current question, previous question and previous topic labels.
4. Enable **Use public mempool estimates for fee and timing questions**. Only the public testnet3 recommended-fees endpoint is fetched; no transaction or question goes to mempool and no mempool API key is needed. Ask again after the snapshot loads.
5. Read the answer or choose **Hear this answer**. Up to eight turns remain in tab memory, with answer source and fee-snapshot timestamps. Voice questions require the separate browser-speech consent.
6. Confirm the intended recipient, amount and fee limit separately, then verify the file against that instruction. If anything changes, the conversation and pending question operations are discarded. Signing and broadcasting remain in the wallet.

## Server setup

Copy `.env.example` to `.env.local` if you do not already have a local env file. Set `OPENAI_API_KEY` there; never expose it through a `VITE_*` variable or browser input. `OPENAI_CONVERSATION_MODEL` defaults to `gpt-4.1-mini` and can select another compatible model. Restart Vite after changing configuration. On Vercel, set these server environment variables and deploy the accompanying `api/openai/conversation.ts` function. A plain static host only supports local question understanding.

The API uses the Responses API with a strict topic-list schema, no tools and `store: false`. The application does not log questions or credentials. This does not promise zero provider retention; provider policies still apply. [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [API authentication](https://developers.openai.com/api/reference/overview), [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Only question text, previous question text, previous topics and language go to OpenAI. PSBT bytes, addresses, payment intent and transaction facts are not attached. Sensitive text voluntarily included in a question would still be transmitted, so the consent disclosure asks users to omit it. Suggested prompts and locally recognized safety questions stay local; other opted-in questions use OpenAI. Gemini remains available for unrecognized single questions without conversation history.

The server validates request/response shape, rejects incomplete/refused responses, bounds the request body and provider response, uses a 15-second provider timeout, and permits up to two simultaneous requests and ten provider requests per minute per running instance. These are per-instance limits, not account-wide quotas or authentication. Provider failure produces a labeled local fallback. Local/preview endpoints require loopback same-origin requests; the Vercel endpoint requires HTTPS same-origin requests.

## What fee and timing answers mean

The fee in sats is only reported when input evidence is complete. For native P2WPKH inputs with hash-linked evidence, the parser estimates signed virtual size using maximum-size DER signature placeholders and compressed pubkeys. This creates no signature or signed payment. Fee divided by estimated vsize is an approximate rate; actual signatures may make the final rate slightly higher.

Fee comparisons use the current fast, half-hour, hour and economy recommendations. “More than twice the fastest recommendation” is a transparent comparison heuristic, not a rule proving a fee is inappropriate. Slower-target savings use the estimated size and round the proposed fee upward; the app never changes the PSBT or confirmed fee cap.

Confirmation answers place the approximate rate in a provider target bracket. They are not transaction simulations and do not check mempool admission, ancestor packages or unspentness. The waiting period begins after wallet broadcast; Awaaz never broadcasts. Testnet3 block times are particularly variable. First confirmation is distinct from settlement requirements or multiple confirmations. Timelocks and unsupported semantics prevent a useful timing estimate. PSBT chain origin cannot be established, so these testnet estimates are not mainnet advice.

Snapshots expire after five minutes. Missing input evidence, failed fee requests, stale estimates and unsupported questions get explicit unknown/fallback responses. Network context never changes MATCH/MISMATCH/INCOMPLETE.

Sources: [mempool public fee API](https://mempool.space/testnet/docs/api/rest), [BIP141 transaction virtual size](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki).

No tests, builds, lint, formatting checks, browser validation or live API calls were performed for this update, per project instructions. The feature is implemented but runtime and provider behavior remain unverified.

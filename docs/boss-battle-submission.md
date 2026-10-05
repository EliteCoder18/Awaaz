# Awaaz · BOSS Battle submission

## Recommended track: Machine Money

The organizer describes Machine Money as the intersection of Bitcoin with AI, agents and automation. The expanded Devfolio description also welcomes machine intelligence serving people and existing Bitcoin infrastructure. Awaaz fits this second direction: a bilingual assistant for understanding an unsigned Bitcoin transaction before signing.

Freedom Stack emphasizes Nostr, Bitcoin and freedom from trusted intermediaries; Awaaz has no Nostr integration. Cypherpunk emphasizes practical Bitcoin privacy; Awaaz's memory-only review is a useful privacy boundary, but it does not provide transaction anonymity or a Bitcoin privacy protocol. Machine Money is the clearest fit for the implemented product.

Sources: [Devfolio prizes](https://boss-battle.devfolio.co/prizes?partner=Bitshala), [Bitshala's organizer overview](https://luma.com/bitshala-bossbattle).

## Tagline

Ask about your Bitcoin payment in your own words. Understand before you sign.

## The problem it solves

An unsigned Bitcoin transaction is hard to understand if you do not read transaction structures, prefer Hindi, or need spoken guidance. A recipient mismatch, unexpected output or excessive fee can hide behind an unfamiliar wallet interface.

Awaaz is a testnet Bitcoin review companion. Users explicitly confirm a recipient, exact sats and maximum fee, then import an unsigned PSBT. A local engine checks the transaction against those instructions and presents MATCH, MISMATCH or INCOMPLETE with visible warnings and optional narration.

Users can ask about recipients, amounts, fees, total debit, change, unusual details and review limits in Hindi, English or Hinglish. Recognized questions are answered locally. With separate consent and a configured local server, Gemini interprets unfamiliar wording into one supported question category. The model does not generate financial facts: answers come from the checked transaction, and unsupported questions are declined. The UI identifies when Gemini interpreted a question.

This is machine intelligence serving Bitcoin users. AI helps with language while exact Bitcoin accounting, intent confirmation and the signing decision remain outside model authority. No private keys, wallet connection, signing or broadcasting are involved.

## Challenges in the implementation

The central design challenge is separating language understanding from financial authority. Gemini returns a category from a constrained schema; it cannot supply amounts or change a verdict. The local engine uses exact bigint accounting, explicit intent confirmation and script comparisons. Missing evidence and unsupported transaction semantics prevent a MATCH result.

Another challenge is keeping explanations current as the user edits a payment. Pending speech, question requests and verification work are cancelled when the relevant session changes; stale responses must not become the explanation for a different transaction.

Finally, accessibility and privacy require usable alternatives. Typed input, visible warnings, Hindi/English reports and optional audio share the same review facts. Gemini consent is separate from microphone consent, and questions understood locally are not sent to the model even when cloud assistance is enabled.

## What to show the judges

1. Confirm the synthetic 50,000-sat payment to Riya with a 2,000-sat fee cap.
2. Review the tampered transaction and show the wrong recipient and tenfold amount discrepancy.
3. Review the correct fixture: 50,000-sat payment, 1,000-sat fee, 51,000-sat external debit and 9,000-sat configured change.
4. Ask a suggested question to show local answers. Opt into Gemini and ask a synthetic paraphrase such as “What portion is paid to miners?” Show the interpretation source if Gemini successfully maps it to the fee category.
5. Ask about safety to show honest limits. Edit the payment to show the previous result is invalidated.

See the [demo script](demo-script.md) for the full sequence and fallback behavior.

## Submission boundaries

This is an experimental testnet PSBT v0 prototype with a limited supported input policy. MATCH means consistency with confirmed intent, not proof of identity, ownership, unspentness or safety. Gemini needs a configured local server and API credential; static hosting provides only the local path. Browser recognition may use an external provider, and narration needs a matching installed voice. This is not Gemini Live, continuous cloud audio, an autonomous payment system, an audited mainnet wallet or a privacy protocol.

No new tests, builds, lint, formatting checks or browser validation were performed for this track-alignment update, per project instructions. This document is submission copy; it does not record a newly validated demo or publish a Devfolio submission.

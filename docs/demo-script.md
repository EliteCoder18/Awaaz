# Awaaz companion demo — about two minutes

Run locally in desktop Chrome. All six scenario buttons use synthetic transactions with no funds. Nothing is signed or broadcast.

Start on the new dashboard (`/`). Show the real session readiness and choose **Review a payment** to enter `/review`. Alternatively **Try the guided demo** starts a fresh synthetic session, replacing desk inputs with demo settings, instruction and a tampered transaction; explicit confirmation and verification remain your actions. The guide and developer pages are real routes, not placeholder links. Returning to Overview preserves a completed unchanged review; reload clears it. No login is required.

1. Introduce: “Awaaz checks what I meant against what my Bitcoin transaction actually does.”
2. Use **Speak intent** after opting into browser speech, or **Use demo phrase**. Say “Send fifty thousand sats to Riya” / “रिया को पचास हजार सैट्स भेजो”. If recognition fails, type the phrase; never spend the demo troubleshooting a provider.
3. Expand **More checks (optional)** to add purpose “Urgent medical help after a phone call,” mark the recipient new, and leave independent checking unchecked. Show the exact recipient address, 50,000 sats and maximum fee 2,000 sats. Select **Confirm payment intent**. Voice confidence never confirms a payment.
4. Load **Wrong recipient · 10×**. Verify. Show recipient mismatch and expected 50,000 versus actual 5,00,000 sats. Select **Hear this review** if the OS provides the selected language voice. “Do not sign.”
5. Choose **2 Bring the file** before loading **An extra payment**, then **Fee above your limit**, verifying each. Known contacts do not automatically authorize additional payments. Detailed view keeps all steps visible if preferred.
6. Return to step 2 and load **Correct payment**. Verify: payment 50,000, fee 1,000, debit 51,000, configured change 9,000 sats. Show the picture receipt, then open **Every input & output** and **View review record**. Configured change does not prove ownership.
7. Ask **How much leaves my wallet?** and **Does anything look unusual?**. The transaction may match while the urgent/new-recipient context still deserves independent checking. Ask “Am I safe?” to show the explicit limits, not a reassurance.
8. Optional: open recipient settings and import a payment-request QR image. Show its untrusted label and address. Nothing saves without separate address review. Use a clear single-frame Base64 PSBT QR for the transaction path; ordinary PSBT files remain the reliable fallback.
9. Optional: expand **Network details (optional)** and select **Load public fee estimates**. Explain the opt-in testnet3 source, timestamp and distinction from the exact 1,000-sat transaction fee. If the provider is unavailable, continue with deterministic review.
10. Edit purpose/instruction or replace the transaction: old reports/questions clear. Reset, choose Hindi and repeat with the preset if desired. Spoken Hindi requires a matching installed system voice.

Close: “This is an independent, non-signing testnet review prototype. MATCH means consistency with my confirmed instruction, not a guarantee of ownership, unspent inputs or safety. Signing stays in my wallet.”

Before recording: pick a matching system voice if using audio, check microphone permission manually, close wallet tabs containing private details, and keep the synthetic demo profile visible. No custom cursor or scrolling animation is required.

Show **Hear this step** and **Sound off** as separate choices. Sound off must leave every warning visible and the manual flow fully usable. For Hindi, change the review's Language selector; the site language selector controls explanation pages independently. Do not describe pictograms as a substitute for validated Indian Sign Language or claim all deaf/low-literacy users will understand without testing.

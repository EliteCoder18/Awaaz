// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createReviewBinding, isSameReview } from "./reviewBinding";
import { confirmIntent } from "./intentConfirmation";
import { interpretIntent } from "./intentInterpreter";
import { fromBase64 } from "./encoding";
import { DEMO_WALLET_PROFILE, CORRECT_PSBT_BASE64 } from "../demo/fixtures";
import type { ReviewSnapshot } from "./types";
function snapshot(): ReviewSnapshot {
  const draft = interpretIntent(
    {
      transcript: "Send 50000 sats to Riya",
      locale: "en-IN",
      source: "edited",
    },
    DEMO_WALLET_PROFILE.addressBook,
  );
  return {
    intent: confirmIntent(
      draft,
      draft.expectedScriptHexes[0],
      { maxFeeSats: 2000n, revision: 1 },
      1,
    ),
    profile: structuredClone(DEMO_WALLET_PROFILE),
    psbtBytes: fromBase64(CORRECT_PSBT_BASE64),
    evidence: { previousTransactions: [] },
    sessionId: 1,
    revision: 1,
  };
}
describe("review binding", () => {
  it("binds the user-declared reason and context", async () => {
    const a = snapshot(),
      b = snapshot();
    b.intent.context = {
      purpose: "Urgent medical help",
      relationship: "new",
      independentlyVerified: false,
    };
    expect(
      isSameReview(await createReviewBinding(a), await createReviewBinding(b)),
    ).toBe(false);
  });
  it("is deterministic and compares full digests", async () => {
    const s = snapshot();
    expect(
      isSameReview(await createReviewBinding(s), await createReviewBinding(s)),
    ).toBe(true);
  });
  it.each(["amount", "fee", "transcript", "psbt", "profile", "evidence"])(
    "invalidates changes to %s",
    async (field) => {
      const a = snapshot(),
        b = snapshot();
      if (field === "amount") b.intent.amountSats += 1n;
      if (field === "fee") b.intent.policy.maxFeeSats += 1n;
      if (field === "transcript") b.intent.transcript += " ";
      if (field === "psbt") b.psbtBytes[20] ^= 1;
      if (field === "profile") b.profile.revision = 2;
      if (field === "evidence")
        b.evidence.previousTransactions.push(Uint8Array.of(1, 2, 3));
      expect(
        isSameReview(
          await createReviewBinding(a),
          await createReviewBinding(b),
        ),
      ).toBe(false);
    },
  );
  it("canonicalizes unordered profile sets", async () => {
    const a = snapshot(),
      b = snapshot();
    b.profile.addressBook.reverse();
    b.profile.addressBook.forEach((e) => e.aliases.reverse());
    expect(
      isSameReview(await createReviewBinding(a), await createReviewBinding(b)),
    ).toBe(true);
  });
});

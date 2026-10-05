import { describe, it, expect } from "vitest";
import corpus from "./fixtures/intent-corpus.json";
import { interpretIntent } from "./intentInterpreter";
import { DEMO_WALLET_PROFILE } from "../demo/fixtures";
describe("Hindi, Hinglish and English intent corpus", () => {
  it.each(corpus)("$transcript", ({ transcript, expected }) => {
    const intent = interpretIntent(
      { transcript, locale: "hi-IN", source: "edited" },
      DEMO_WALLET_PROFILE.addressBook,
    );
    if (expected === null) expect(intent.ambiguities.length).toBeGreaterThan(0);
    else {
      expect(intent.ambiguities).toEqual([]);
      expect(intent.amountSats).toBe(BigInt(expected));
    }
  });
});

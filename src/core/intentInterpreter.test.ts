import { describe, expect, it } from "vitest";

import { interpretIntent } from "./intentInterpreter";

const addressBook = [
  {
    id: "riya",
    displayName: "Riya",
    aliases: ["riya", "रिया"],
    scriptHexes: ["00141111111111111111111111111111111111111111"],
  },
];

describe("interpretIntent", () => {
  it("extracts an English recipient and sats amount", () => {
    const intent = interpretIntent(
      {
        transcript: "Send 50,000 sats to Riya",
        locale: "en-IN",
        source: "preset",
      },
      addressBook,
    );

    expect(intent.recipientAlias).toBe("riya");
    expect(intent.amountSats).toBe(50_000n);
    expect(intent.ambiguities).toEqual([]);
  });

  it("normalizes Devanagari digits in a Hindi sats instruction", () => {
    const intent = interpretIntent(
      {
        transcript: "रिया को ५०,००० सैट्स भेजो",
        locale: "hi-IN",
        source: "speech",
      },
      addressBook,
    );

    expect(intent.recipientAlias).toBe("riya");
    expect(intent.amountSats).toBe(50_000n);
    expect(intent.ambiguities).toEqual([]);
  });

  it("converts an exact BTC amount to satoshis", () => {
    const intent = interpretIntent(
      {
        transcript: "Send 0.0005 BTC to Riya",
        locale: "en-IN",
        source: "edited",
      },
      addressBook,
    );

    expect(intent.amountSats).toBe(50_000n);
    expect(intent.ambiguities).toEqual([]);
  });

  it("fails closed when a numeric amount has no Bitcoin unit", () => {
    const intent = interpretIntent(
      {
        transcript: "Send 50000 to Riya",
        locale: "en-IN",
        source: "edited",
      },
      addressBook,
    );

    expect(intent.amountSats).toBeUndefined();
    expect(intent.ambiguities.map((ambiguity) => ambiguity.code)).toContain(
      "MISSING_UNIT",
    );
  });

  it("recognizes the Hindi phrase pachaas hazaar sats", () => {
    const intent = interpretIntent(
      {
        transcript: "रिया को पचास हजार सैट्स भेजो",
        locale: "hi-IN",
        source: "speech",
      },
      addressBook,
    );

    expect(intent.amountSats).toBe(50_000n);
    expect(intent.ambiguities).toEqual([]);
  });

  it("fails closed when more than one known recipient is mentioned", () => {
    const intent = interpretIntent(
      {
        transcript: "Send 50,000 sats to Riya or Asha",
        locale: "en-IN",
        source: "edited",
      },
      [
        ...addressBook,
        {
          id: "asha",
          displayName: "Asha",
          aliases: ["asha", "आशा"],
          scriptHexes: ["00145555555555555555555555555555555555555555"],
        },
      ],
    );

    expect(intent.recipientAlias).toBeUndefined();
    expect(intent.expectedScriptHexes).toEqual([]);
    expect(intent.ambiguities.map((ambiguity) => ambiguity.code)).toContain(
      "AMBIGUOUS_RECIPIENT",
    );
  });

  it("rejects fractional satoshi amounts instead of rounding them", () => {
    const intent = interpretIntent(
      {
        transcript: "Send 50.5 sats to Riya",
        locale: "en-IN",
        source: "edited",
      },
      addressBook,
    );

    expect(intent.amountSats).toBeUndefined();
    expect(intent.ambiguities.map((ambiguity) => ambiguity.code)).toContain(
      "UNSUPPORTED_AMOUNT",
    );
  });
});

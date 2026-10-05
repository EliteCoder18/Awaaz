import { describe, it, expect } from "vitest";
import { confirmIntent } from "./intentConfirmation";
import { interpretIntent } from "./intentInterpreter";
import { DEMO_WALLET_PROFILE, RIYA_SCRIPT_HEX } from "../demo/fixtures";
const draft = interpretIntent(
  { transcript: "Send 50000 sats to Riya", locale: "en-IN", source: "edited" },
  DEMO_WALLET_PROFILE.addressBook,
);
describe("intent confirmation", () => {
  it("requires an address from the resolved recipient", () =>
    expect(() =>
      confirmIntent(
        draft,
        "0014" + "99".repeat(20),
        { maxFeeSats: 2000n, revision: 1 },
        1,
      ),
    ).toThrow());
  it("requires a valid fee policy", () =>
    expect(() =>
      confirmIntent(
        draft,
        RIYA_SCRIPT_HEX,
        { maxFeeSats: -1n, revision: 1 },
        1,
      ),
    ).toThrow());
  it("does not confirm ambiguous instructions", () =>
    expect(() =>
      confirmIntent(
        {
          ...draft,
          ambiguities: [{ code: "MULTIPLE_AMOUNTS", detail: "two amounts" }],
        },
        RIYA_SCRIPT_HEX,
        { maxFeeSats: 2000n, revision: 1 },
        1,
      ),
    ).toThrow());
  it("binds exact sats and fee to the revision", () =>
    expect(
      confirmIntent(
        draft,
        RIYA_SCRIPT_HEX,
        { maxFeeSats: 2000n, revision: 3 },
        3,
      ),
    ).toMatchObject({
      confirmed: true,
      amountSats: 50000n,
      revision: 3,
      policy: { maxFeeSats: 2000n },
    }));
});

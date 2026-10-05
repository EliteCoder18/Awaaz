import { describe, it, expect } from "vitest";
import { createWalletProfile } from "./walletProfile";
import {
  RIYA_ADDRESS,
  CHANGE_ADDRESS,
  RIYA_SCRIPT_HEX,
} from "../demo/fixtures";
const input = {
  recipients: [
    {
      id: "riya",
      name: "Riya",
      aliases: ["riya", "रिया"],
      address: RIYA_ADDRESS,
    },
  ],
  changeAddresses: [CHANGE_ADDRESS],
  source: "user-reviewed" as const,
  revision: 1,
};
describe("reviewed wallet profiles", () => {
  it("derives scripts from checksum-valid addresses", () => {
    expect(createWalletProfile(input).addressBook[0].scriptHexes).toEqual([
      RIYA_SCRIPT_HEX,
    ]);
  });
  it("rejects recipient and change overlap", () =>
    expect(() =>
      createWalletProfile({ ...input, changeAddresses: [RIYA_ADDRESS] }),
    ).toThrow(/different/));
  it.each([
    "bc1qinvalid",
    "not an address",
    RIYA_ADDRESS.slice(0, -1) + "x",
    "abandon ".repeat(12),
  ])("rejects invalid, mainnet or seed-like input %s", (address) =>
    expect(() =>
      createWalletProfile({
        ...input,
        recipients: [{ ...input.recipients[0], address }],
      }),
    ).toThrow(),
  );
  it("rejects ambiguous aliases across contacts", () =>
    expect(() =>
      createWalletProfile({
        ...input,
        recipients: [
          ...input.recipients,
          {
            id: "asha",
            name: "Asha",
            aliases: ["riya"],
            address: CHANGE_ADDRESS,
          },
        ],
      }),
    ).toThrow(/aliases/));
});

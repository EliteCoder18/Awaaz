import { describe, expect, it } from "vitest";

import { parsePsbt } from "../core/psbtParser";
import {
  CORRECT_PSBT_BASE64,
  DEMO_WALLET_PROFILE,
  TAMPERED_PSBT_BASE64,
} from "./fixtures";

describe("demo PSBT fixtures", () => {
  it("contains one matching payment and one tampered payment", () => {
    const correct = parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE);
    const tampered = parsePsbt(TAMPERED_PSBT_BASE64, DEMO_WALLET_PROFILE);

    expect(
      correct.outputs.find((output) => output.classification === "recipient")
        ?.valueSats,
    ).toBe(50_000n);
    expect(correct.feeSats).toBe(1_000n);

    expect(
      tampered.outputs.find((output) => output.classification === "unknown")
        ?.valueSats,
    ).toBe(500_000n);
    expect(tampered.feeSats).toBe(1_000n);
  });
});

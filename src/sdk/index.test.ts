import { expect, it } from "vitest";
import {
  interpretIntent,
  confirmIntent,
  parsePsbt,
  verifyPayment,
  presentReport,
} from "./index";
import {
  DEMO_WALLET_PROFILE,
  CORRECT_PSBT_BASE64,
  RIYA_SCRIPT_HEX,
} from "../demo/fixtures";
it("exports a UI-independent engine for a real PSBT review", () => {
  const draft = interpretIntent(
    {
      transcript: "Send 50000 sats to Riya",
      locale: "en-IN",
      source: "edited",
    },
    DEMO_WALLET_PROFILE.addressBook,
  );
  const intent = confirmIntent(
    draft,
    RIYA_SCRIPT_HEX,
    { maxFeeSats: 2000n, revision: 1 },
    1,
  );
  const report = verifyPayment(
    intent,
    parsePsbt(CORRECT_PSBT_BASE64, DEMO_WALLET_PROFILE),
    DEMO_WALLET_PROFILE,
  );
  expect(report.verdict).toBe("MATCH");
  expect(presentReport(report, "en-IN").speech).toContain("51,000");
});

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PsbtPreview } from "./PsbtPreview";
import { buildDemoPsbt, DEMO_WALLET_PROFILE } from "../demo/fixtures";
import { fromBase64 } from "../core/encoding";

it("explains an unsigned file in Hindi before any intent is confirmed", () => {
  render(
    <PsbtPreview
      bytes={fromBase64(buildDemoPsbt("correct"))}
      profile={DEMO_WALLET_PROFILE}
      evidence={{ previousTransactions: [] }}
      quiet={false}
      onRead={() => {}}
    />,
  );
  expect(screen.getByLabelText("फ़ाइल का सरल हिसाब")).toHaveTextContent(
    "50,000",
  );
  expect(screen.getByLabelText("नेटवर्क का शुल्क")).toHaveTextContent("1,000");
  expect(
    screen.getByText(/अभी आपके निर्देश से मेल नहीं जाँचा गया/),
  ).toBeVisible();
  expect(screen.queryByText("निर्देश मेल खाता है")).not.toBeInTheDocument();
});

it("does not claim a fee when previous transaction evidence is missing", () => {
  render(
    <PsbtPreview
      bytes={fromBase64(buildDemoPsbt("missing-evidence"))}
      profile={DEMO_WALLET_PROFILE}
      evidence={{ previousTransactions: [] }}
      quiet={false}
      onRead={() => {}}
    />,
  );
  expect(screen.getByLabelText("नेटवर्क का शुल्क")).toHaveTextContent(
    "पता नहीं चल पाया",
  );
  expect(screen.getByText(/साइन न करें/)).toBeVisible();
});

it("explains an invalid file without presenting transaction details", () => {
  render(
    <PsbtPreview
      bytes={new Uint8Array([1, 2, 3])}
      profile={DEMO_WALLET_PROFILE}
      evidence={{ previousTransactions: [] }}
      quiet={false}
      onRead={() => {}}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "यह फ़ाइल पढ़ी नहीं जा सकी",
  );
  expect(screen.queryByLabelText("नेटवर्क का शुल्क")).not.toBeInTheDocument();
});

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { App } from "./App";
import { runReview } from "../core/runReview";
import { CORRECT_PSBT_BASE64 } from "../demo/fixtures";
import { decodeQrImage } from "../adapters/qrImage";
import { recognizeSpeech } from "../adapters/speechRecognizer";
import type { SpeechResult } from "../core/types";
vi.mock("../adapters/verificationClient", () => ({
  runVerification: (snapshot: Parameters<typeof runReview>[0]) =>
    runReview(snapshot),
}));
vi.mock("../adapters/qrImage", () => ({ decodeQrImage: vi.fn() }));
vi.mock("../adapters/speechRecognizer", () => ({ recognizeSpeech: vi.fn() }));
it.each(["transaction", "context", "reset"])(
  "discards delayed QR after %s changes",
  async (change) => {
    let resolve!: (value: string) => void;
    let signal!: AbortSignal;
    vi.mocked(decodeQrImage).mockImplementation((_file, s) => {
      signal = s;
      return new Promise((r) => (resolve = r));
    });
    const user = userEvent.setup();
    render(<App />);
    await user.upload(
      screen.getByLabelText("Transaction QR image"),
      new File(["image"], "qr.png", { type: "image/png" }),
    );
    if (change === "transaction")
      await user.click(
        screen.getByRole("button", { name: "Load tampered PSBT" }),
      );
    if (change === "context")
      await user.type(
        screen.getByLabelText("What is this payment for?"),
        "Help",
      );
    if (change === "reset")
      await user.click(screen.getByRole("button", { name: "Reset session" }));
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(CORRECT_PSBT_BASE64));
    expect(
      screen.queryByText("QR transaction.psbt", { exact: true }),
    ).not.toBeInTheDocument();
    if (change === "transaction")
      expect(
        screen.getByText("demo-tampered.psbt", { exact: true }),
      ).toBeInTheDocument();
  },
);
it("revoking speech consent aborts a spoken question and rejects its late answer", async () => {
  let resolve!: (value: SpeechResult) => void;
  let signal!: AbortSignal;
  vi.mocked(recognizeSpeech).mockImplementation(
    (_locale, _factory, _timeout, s) => {
      signal = s!;
      return new Promise((r) => (resolve = r));
    },
  );
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Use demo phrase" }));
  await user.click(
    screen.getByRole("button", { name: "Confirm payment intent" }),
  );
  await user.click(screen.getByRole("button", { name: "Load correct PSBT" }));
  await user.click(screen.getByRole("button", { name: "Verify transaction" }));
  await screen.findByRole("heading", { name: "Transaction matches" });
  await user.click(screen.getByLabelText(/Allow browser speech/));
  await user.click(screen.getByRole("button", { name: "Speak a question" }));
  await user.click(screen.getByLabelText(/Allow browser speech/));
  expect(signal.aborted).toBe(true);
  await act(async () =>
    resolve({
      transcript: "How much leaves my wallet?",
      locale: "en-IN",
      source: "speech",
    }),
  );
  expect(document.querySelector(".conversation-answer")).toBeNull();
});

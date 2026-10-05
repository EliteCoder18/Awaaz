import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { Site } from "./Site";
import { runReview } from "../../core/runReview";
import { decodeQrImage } from "../../adapters/qrImage";
import { CORRECT_PSBT_BASE64 } from "../../demo/fixtures";
import { runVerification } from "../../adapters/verificationClient";
import { recognizeSpeech } from "../../adapters/speechRecognizer";
import type {
  ReviewResult,
  ReviewSnapshot,
  SpeechResult,
} from "../../core/types";
vi.mock("../../adapters/verificationClient", () => ({
  runVerification: vi.fn((s: Parameters<typeof runReview>[0]) => runReview(s)),
}));
vi.mock("../../adapters/qrImage", () => ({ decodeQrImage: vi.fn() }));
vi.mock("../../adapters/speechRecognizer", () => ({
  recognizeSpeech: vi.fn(),
}));
beforeEach(() => {
  window.history.replaceState({}, "", "/?flow=intent");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
it("opens the actual review from the dashboard and focuses its heading", async () => {
  const user = userEvent.setup();
  render(<Site />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Understand your payment",
  );
  await user.click(screen.getByRole("link", { name: "Review a payment" }));
  expect(window.location.pathname).toBe("/review");
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Payment review",
  );
  expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  expect(screen.getByLabelText("Payment instruction")).toBeVisible();
});
it("demo fills fixtures but never confirms or verifies automatically", async () => {
  const user = userEvent.setup();
  render(<Site />);
  await user.click(screen.getByRole("link", { name: "Try the guided demo" }));
  expect(screen.getByLabelText("Payment instruction")).toHaveValue(
    "Send 50,000 sats to Riya",
  );
  expect(
    screen.getByRole("button", { name: "Confirm payment intent" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Verify transaction", hidden: true }),
  ).toBeDisabled();
  expect(
    screen.queryByRole("heading", { name: "Transaction matches" }),
  ).not.toBeInTheDocument();
});
it.each([false, true])(
  "guided demo recovers a %s-saved custom profile without approving payment",
  async (saved) => {
    window.history.replaceState({}, "", "/review?details=1");
    const user = userEvent.setup();
    render(<Site />);
    await user.click(screen.getByText("Recipient & change addresses"));
    await user.clear(screen.getByLabelText("Recipient name"));
    await user.type(screen.getByLabelText("Recipient name"), "Maya");
    await user.clear(screen.getByLabelText("Spoken names, comma separated"));
    await user.type(
      screen.getByLabelText("Spoken names, comma separated"),
      "Maya",
    );
    if (saved) {
      await user.click(
        screen.getByLabelText(
          "I independently checked these recipient and change addresses.",
        ),
      );
      await user.click(
        screen.getByRole("button", { name: "Save reviewed addresses" }),
      );
    }
    await user.clear(screen.getByLabelText("Maximum total network fee"));
    await user.type(screen.getByLabelText("Maximum total network fee"), "0");
    await user.type(
      screen.getByLabelText("What is this payment for?"),
      "Urgent help",
    );
    await user.click(screen.getByRole("link", { name: "Overview" }));
    await user.click(screen.getByRole("link", { name: "Try the guided demo" }));
    expect(screen.getByLabelText("Maximum total network fee")).toHaveValue(
      "2000",
    );
    expect(screen.getByLabelText("What is this payment for?")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Verify transaction" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Confirm payment intent" }),
    );
    expect(
      screen.getByRole("button", { name: "Verify transaction" }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "Verify transaction" }),
    );
    await screen.findByRole("heading", { name: "Transaction does not match" });
  },
);
it("preserves unchanged review and updates real dashboard readiness", async () => {
  window.history.replaceState({}, "", "/review?details=1");
  const user = userEvent.setup();
  render(<Site />);
  await user.click(screen.getByRole("button", { name: "Use demo phrase" }));
  await user.click(
    screen.getByRole("button", { name: "Confirm payment intent" }),
  );
  await user.click(screen.getByRole("button", { name: "Load correct PSBT" }));
  await user.click(screen.getByRole("button", { name: "Verify transaction" }));
  await screen.findByRole("heading", { name: "Transaction matches" });
  await user.click(screen.getByRole("link", { name: "Overview" }));
  expect(screen.getByLabelText("Session readiness")).toHaveTextContent("MATCH");
  await user.click(screen.getByRole("link", { name: "Review desk" }));
  expect(
    screen.getByRole("heading", { name: "Transaction matches" }),
  ).toBeVisible();
  await user.type(screen.getByLabelText("Payment instruction"), " edited");
  await user.click(screen.getByRole("link", { name: "Overview" }));
  expect(screen.getByLabelText("Session readiness")).not.toHaveTextContent(
    "MATCH",
  );
});
it("leaving the desk cancels delayed QR and rejects its later result", async () => {
  window.history.replaceState({}, "", "/review?details=1");
  let resolve!: (v: string) => void;
  let signal!: AbortSignal;
  vi.mocked(decodeQrImage).mockImplementation((_f, s) => {
    signal = s;
    return new Promise((r) => (resolve = r));
  });
  const user = userEvent.setup();
  render(<Site />);
  await user.upload(
    screen.getByLabelText("Transaction QR image"),
    new File(["qr"], "qr.png", { type: "image/png" }),
  );
  await user.click(screen.getByRole("link", { name: "Overview" }));
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(CORRECT_PSBT_BASE64));
  await user.click(screen.getByRole("link", { name: "Review desk" }));
  expect(
    screen.queryByText("QR transaction.psbt", { exact: true }),
  ).not.toBeInTheDocument();
});
it("leaving cancels a pending payment-request QR too", async () => {
  window.history.replaceState({}, "", "/review?details=1");
  let signal!: AbortSignal;
  vi.mocked(decodeQrImage).mockImplementation((_f, s) => {
    signal = s;
    return new Promise(() => {});
  });
  const user = userEvent.setup();
  render(<Site />);
  await user.click(screen.getByText("Recipient & change addresses"));
  await user.upload(
    screen.getByLabelText("Payment request QR image"),
    new File(["qr"], "qr.png", { type: "image/png" }),
  );
  await user.click(screen.getByRole("link", { name: "Overview" }));
  expect(signal.aborted).toBe(true);
});
it("leaving cancels a worker and makes the same confirmed review retryable", async () => {
  window.history.replaceState({}, "", "/review?details=1");
  let signal!: AbortSignal, snapshot!: ReviewSnapshot;
  let resolve!: (v: ReviewResult) => void;
  vi.mocked(runVerification).mockImplementationOnce((s, abort) => {
    signal = abort;
    snapshot = s;
    return new Promise((r) => (resolve = r));
  });
  const user = userEvent.setup();
  render(<Site />);
  await user.click(screen.getByRole("button", { name: "Use demo phrase" }));
  await user.click(
    screen.getByRole("button", { name: "Confirm payment intent" }),
  );
  await user.click(screen.getByRole("button", { name: "Load correct PSBT" }));
  await user.click(screen.getByRole("button", { name: "Verify transaction" }));
  await user.click(screen.getByRole("link", { name: "Overview" }));
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(await runReview(snapshot)));
  expect(screen.getByLabelText("Session readiness")).not.toHaveTextContent(
    "MATCH",
  );
  await user.click(screen.getByRole("link", { name: "Review desk" }));
  expect(
    screen.getByRole("button", { name: "Verify transaction" }),
  ).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Verify transaction" }));
  await screen.findByRole("heading", { name: "Transaction matches" });
});
it("leaving stops recognition and discards a late transcript", async () => {
  window.history.replaceState({}, "", "/review?details=1");
  let signal!: AbortSignal, resolve!: (s: SpeechResult) => void;
  vi.mocked(recognizeSpeech).mockImplementationOnce(
    (_locale, _factory, _timeout, abort) => {
      signal = abort!;
      return new Promise((r) => (resolve = r));
    },
  );
  const user = userEvent.setup();
  render(<Site />);
  await user.click(screen.getByLabelText(/Allow browser speech/));
  await user.click(screen.getByRole("button", { name: "Speak intent" }));
  await user.click(screen.getByRole("link", { name: "Overview" }));
  expect(signal.aborted).toBe(true);
  await act(async () =>
    resolve({
      transcript: "Send 50000 sats to Riya",
      locale: "en-IN",
      source: "speech",
    }),
  );
  await user.click(screen.getByRole("link", { name: "Review desk" }));
  expect(screen.getByLabelText("Payment instruction")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Speak intent" })).toBeEnabled();
});
it("deep links guides and browser back restores the correct page", async () => {
  window.history.replaceState({}, "", "/guide");
  const user = userEvent.setup();
  render(<Site />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "A second look",
  );
  await user.click(screen.getByRole("link", { name: "For builders" }));
  expect(window.location.pathname).toBe("/developers");
  act(() => window.history.back());
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "A second look",
    ),
  );
});
it("offers recovery for unknown pages", async () => {
  window.history.replaceState({}, "", "/missing");
  const user = userEvent.setup();
  render(<Site />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Page not found",
  );
  await user.click(screen.getByRole("link", { name: "Back to overview" }));
  expect(window.location.pathname).toBe("/");
});

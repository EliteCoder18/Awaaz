import { beforeEach, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { runReview } from "../core/runReview";
import { recognizeSpeech } from "../adapters/speechRecognizer";
import { decodeQrImage } from "../adapters/qrImage";
vi.mock("../adapters/speechRecognizer", () => ({ recognizeSpeech: vi.fn() }));
vi.mock("../adapters/qrImage", () => ({ decodeQrImage: vi.fn() }));
vi.mock("../adapters/verificationClient", () => ({
  runVerification: (s: Parameters<typeof runReview>[0]) => runReview(s),
}));
beforeEach(() => window.history.replaceState({}, "", "/review"));
it("guides a silent typed payment one step at a time and shows unsafe money flows", async () => {
  const user = userEvent.setup();
  render(<App embedded />);
  expect(
    screen.getByRole("navigation", { name: "Payment steps" }),
  ).toBeVisible();
  expect(screen.queryByLabelText("Choose a PSBT file")).not.toBeVisible();
  await user.click(screen.getByRole("button", { name: "Sound off" }));
  expect(screen.getByRole("button", { name: "Sound off" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Hear this step" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Use demo phrase" }));
  expect(screen.getByRole("button", { name: "Read aloud" })).toBeDisabled();
  await user.click(
    screen.getByRole("button", { name: "Confirm payment intent" }),
  );
  expect(screen.getByLabelText("Choose a PSBT file")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Bring the payment into focus." }),
  ).toHaveFocus();
  expect(screen.queryByLabelText("Payment instruction")).not.toBeVisible();
  await user.click(screen.getByRole("button", { name: "Load tampered PSBT" }));
  await user.click(screen.getByRole("button", { name: "Verify transaction" }));
  await screen.findByRole("heading", { name: "Transaction does not match" });
  expect(screen.getByLabelText("Picture payment receipt")).toHaveTextContent(
    "50,000",
  );
  expect(screen.getByLabelText("Picture payment receipt")).toHaveTextContent(
    "5,00,000",
  );
  expect(screen.getByLabelText("Other payments")).toHaveTextContent("5,00,000");
  expect(screen.getByLabelText("To Riya")).toHaveTextContent("0 sats");
  expect(screen.getByText("DO NOT SIGN", { exact: true })).toBeVisible();
});
it("detailed view preserves facts and edits return simple view to the first step", async () => {
  const user = userEvent.setup();
  render(<App embedded />);
  await user.click(screen.getByRole("button", { name: "Use demo phrase" }));
  await user.click(
    screen.getByRole("button", { name: "Confirm payment intent" }),
  );
  await user.click(screen.getByRole("button", { name: "Load correct PSBT" }));
  await user.click(screen.getByRole("button", { name: "Verify transaction" }));
  await screen.findByRole("heading", { name: "Transaction matches" });
  await user.click(screen.getByRole("button", { name: "Detailed view" }));
  expect(
    screen.getByRole("heading", { name: "Transaction matches" }),
  ).toBeVisible();
  await user.type(screen.getByLabelText("Payment instruction"), " edited");
  await user.click(screen.getByRole("button", { name: "Simple view" }));
  expect(screen.getByLabelText("Payment instruction")).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "Transaction matches" }),
  ).not.toBeInTheDocument();
});
it("a Hindi manual path uses the same visual receipt without microphone consent", async () => {
  const user = userEvent.setup();
  render(<App embedded />);
  await user.selectOptions(screen.getByLabelText("Language"), "hi-IN");
  await user.click(
    screen.getByRole("button", { name: "डेमो वाक्य इस्तेमाल करें" }),
  );
  await user.click(
    screen.getByRole("button", { name: "भुगतान निर्देश की पुष्टि करें" }),
  );
  await user.click(screen.getByRole("button", { name: "सही PSBT लोड करें" }));
  await user.click(
    screen.getByRole("button", { name: "लेन-देन सत्यापित करें" }),
  );
  await screen.findByLabelText("चित्र में भुगतान का हिसाब");
  expect(screen.getByLabelText("चित्र में भुगतान का हिसाब")).toHaveTextContent(
    "51,000",
  );
  expect(screen.getByLabelText("चित्र में भुगतान का हिसाब")).toHaveTextContent(
    "50,000",
  );
});
it.each(["2 Bring the file", "Detailed view"])(
  "%s cancels spoken questions without removing a completed review",
  async (control) => {
    const user = userEvent.setup();
    let signal!: AbortSignal;
    let resolve!: (value: import("../core/types").SpeechResult) => void;
    vi.mocked(recognizeSpeech).mockImplementationOnce(
      (_locale, _factory, _timeout, abort) => {
        signal = abort!;
        return new Promise((r) => {
          resolve = r;
        });
      },
    );
    render(<App embedded />);
    await user.click(screen.getByLabelText(/Allow browser speech/));
    await user.click(screen.getByRole("button", { name: "Use demo phrase" }));
    await user.click(
      screen.getByRole("button", { name: "Confirm payment intent" }),
    );
    await user.click(screen.getByRole("button", { name: "Load correct PSBT" }));
    await user.click(
      screen.getByRole("button", { name: "Verify transaction" }),
    );
    await screen.findByRole("heading", { name: "Transaction matches" });
    await user.click(screen.getByRole("button", { name: "Speak a question" }));
    await user.click(
      screen.getByRole("button", {
        name: control === "Detailed view" ? control : /^2\s*Bring the file$/,
      }),
    );
    expect(signal.aborted).toBe(true);
    await act(async () =>
      resolve({
        transcript: "How much leaves my wallet?",
        locale: "en-IN",
        source: "speech",
      }),
    );
    if (control === "2 Bring the file")
      await user.click(
        screen.getByRole("button", { name: /^3\s*See the result$/ }),
      );
    expect(
      screen.getByRole("heading", { name: "Transaction matches" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Ask about this transaction")).toHaveValue("");
  },
);
it("changing modes aborts a payment-request QR without accepting its late recipient", async () => {
  const user = userEvent.setup();
  let signal!: AbortSignal, resolve!: (s: string) => void;
  vi.mocked(decodeQrImage).mockImplementationOnce((_f, abort) => {
    signal = abort!;
    return new Promise((r) => {
      resolve = r;
    });
  });
  render(<App embedded />);
  await user.click(screen.getByText("Recipient & change addresses"));
  await user.upload(
    screen.getByLabelText("Payment request QR image"),
    new File(["qr"], "qr.png", { type: "image/png" }),
  );
  await user.click(screen.getByRole("button", { name: "Detailed view" }));
  expect(signal.aborted).toBe(true);
  await act(async () =>
    resolve("bitcoin:tb1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3apj6d3?label=Late"),
  );
  expect(screen.queryByText("Late", { exact: true })).not.toBeInTheDocument();
});

it("starts with the file, explains it in Hindi, then asks for independent confirmation", async () => {
  const user = userEvent.setup();
  render(<App embedded fileFirst />);
  expect(screen.getByLabelText("PSBT फ़ाइल चुनें")).toBeVisible();
  expect(screen.queryByLabelText("भुगतान निर्देश")).not.toBeVisible();
  await user.click(
    screen.getByRole("button", {
      name: "उदाहरण देखें: 50,000 सैट्स का भुगतान",
    }),
  );
  expect(screen.getByLabelText("फ़ाइल का सरल हिसाब")).toHaveTextContent(
    "50,000",
  );
  expect(screen.getByLabelText("नेटवर्क का शुल्क")).toHaveTextContent("1,000");
  await user.click(
    screen.getByRole("link", {
      name: "अब देखें: क्या आप यही भुगतान चाहते हैं?",
    }),
  );
  expect(
    screen.getByRole("button", { name: "लेन-देन सत्यापित करें" }),
  ).toBeDisabled();
  await user.click(
    screen.getByRole("button", { name: "डेमो वाक्य इस्तेमाल करें" }),
  );
  await user.click(
    screen.getByRole("button", { name: "भुगतान निर्देश की पुष्टि करें" }),
  );
  await user.click(
    screen.getByRole("button", { name: "लेन-देन सत्यापित करें" }),
  );
  await screen.findByLabelText("चित्र में भुगतान का हिसाब");
  expect(
    screen.getByText("निर्देश मेल खाता है", { exact: true }),
  ).toBeVisible();
  expect(
    screen.getByText("यह सुरक्षा की गारंटी नहीं है।", { exact: true }),
  ).toBeVisible();
});

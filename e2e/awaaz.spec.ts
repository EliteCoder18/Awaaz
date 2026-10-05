import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { Psbt } from "bitcoinjs-lib";
import { buildPublicPrevoutPsbt } from "../src/demo/interoperability";
import {
  CORRECT_PSBT_BASE64,
  TAMPERED_PSBT_BASE64,
  buildDemoPsbt,
} from "../src/demo/fixtures";

async function confirm(page: Page) {
  await page
    .getByRole("button", { name: "Use demo phrase", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Verify transaction", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Confirm payment intent", exact: true })
    .click();
}
async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations
      .filter((v) => ["serious", "critical"].includes(v.impact ?? ""))
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
}
test("runs the confirmed tampered-to-corrected flow and invalidates edits", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Payment review.",
  );
  await axe(page);
  await confirm(page);
  await page
    .getByRole("button", { name: "Load tampered PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Transaction does not match",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".issue-list")).toContainText(
    "expected 50,000 sats, actual 5,00,000 sats",
  );
  expect(
    await page.locator(".verify-button").evaluate((el) =>
      getComputedStyle(el)
        .transitionProperty.split(",")
        .map((p) => p.trim()),
    ),
  ).not.toContain("background");
  await axe(page);
  await page
    .getByRole("button", { name: "Load correct PSBT", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Transaction does not match",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".review-metrics")).toContainText("51,000");
  await page.getByText("View review record", { exact: true }).click();
  await expect(page.locator(".review-receipt")).toContainText("psbtHash");
  await axe(page);
  await page
    .getByLabel("Payment instruction", { exact: true })
    .fill("Send 5000 sats to Riya");
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Verify transaction", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reset session", exact: true })
    .click();
  await expect(
    page.getByLabel("Payment instruction", { exact: true }),
  ).toHaveValue("");
});
test("rejects an extra known recipient, a high fee, and missing evidence", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await confirm(page);
  for (const [button, heading, message] of [
    [
      "Load extra payment PSBT",
      "Transaction does not match",
      "unapproved payment",
    ],
    [
      "Load high fee PSBT",
      "Transaction does not match",
      "Fee exceeds your limit",
    ],
    [
      "Load missing evidence PSBT",
      "Verification is incomplete",
      "Previous transaction evidence is missing",
    ],
  ]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await page
      .getByRole("button", { name: "Verify transaction", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".issue-list")).toContainText(message);
    await axe(page);
  }
});
test("supports binary, text Base64, paste and previous transaction evidence imports", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await confirm(page);
  for (const [name, buffer, heading] of [
    [
      "tampered.psbt",
      Buffer.from(TAMPERED_PSBT_BASE64, "base64"),
      "Transaction does not match",
    ],
    ["correct.psbt", Buffer.from(CORRECT_PSBT_BASE64), "Transaction matches"],
  ] as const) {
    await page
      .getByLabel("Choose a PSBT file", { exact: true })
      .setInputFiles({ name, mimeType: "application/octet-stream", buffer });
    await expect(page.locator(".loaded-file")).toContainText(name);
    await page
      .getByRole("button", { name: "Verify transaction", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByText("Or paste Base64 transaction data", { exact: true })
    .click();
  await page
    .getByLabel("Base64 PSBT", { exact: true })
    .fill(buildDemoPsbt("missing-evidence"));
  await page
    .getByRole("button", { name: "Load pasted PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Verification is incomplete",
      exact: true,
    }),
  ).toBeVisible();
  const previous =
    Psbt.fromBase64(CORRECT_PSBT_BASE64).data.inputs[0].nonWitnessUtxo!;
  await page
    .getByText("Add previous transaction evidence", { exact: false })
    .click();
  await page
    .getByLabel("Previous transactions (raw binary or hex)", { exact: true })
    .setInputFiles({
      name: "previous.hex",
      mimeType: "text/plain",
      buffer: Buffer.from(Buffer.from(previous).toString("hex")),
    });
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
});
test("reports malformed data and oversized imports without retaining a match", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await confirm(page);
  await page
    .getByRole("button", { name: "Load correct PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Choose a PSBT file", { exact: true }).setInputFiles({
    name: "oversized.psbt",
    mimeType: "application/octet-stream",
    buffer: Buffer.alloc(100001),
  });
  await expect(page.getByRole("alert")).toContainText("100,000");
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Choose a PSBT file", { exact: true }).setInputFiles({
    name: "malformed.psbt",
    mimeType: "text/plain",
    buffer: Buffer.from("cHNidP8="),
  });
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Verification is incomplete",
      exact: true,
    }),
  ).toBeVisible();
  await axe(page);
});
test("completes keyboard-only confirmation and an unsupported microphone fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/review?details=1");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toContainText("Simple view");
  await page
    .getByRole("link", { name: "Skip to content", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#workspace")).toBeFocused();
  await page.getByLabel("Allow browser speech.", { exact: false }).check();
  await page.getByRole("button", { name: "Speak intent", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("editable transcript");
  await page
    .getByLabel("Payment instruction", { exact: true })
    .fill("Send fifty thousand sats to Riya");
  await page
    .getByRole("button", { name: "Review instruction", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Confirm payment intent", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Load split payment PSBT", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
});
test("runs a Hindi flow with localized controls and speech fallback", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await page.getByLabel("Language", { exact: true }).selectOption("hi-IN");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page
    .getByRole("button", { name: "डेमो वाक्य इस्तेमाल करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "भुगतान निर्देश की पुष्टि करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "सही PSBT लोड करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "लेन-देन सत्यापित करें", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "लेन-देन मेल खाता है", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "जाँच सुनें", exact: true }).click();
  await expect(page.locator(".audio-status")).not.toBeEmpty();
  await axe(page);
});
test("configures independently reviewed public addresses and requires a new fee confirmation", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await page
    .getByText("Recipient & change addresses", { exact: false })
    .click();
  await page.getByLabel("I independently checked", { exact: false }).check();
  await page
    .getByRole("button", { name: "Save reviewed addresses", exact: true })
    .click();
  await expect(
    page.getByLabel("Maximum total network fee", { exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Use demo phrase", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm payment intent", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Maximum total network fee", { exact: true })
    .fill("2000");
  await page
    .getByRole("button", { name: "Review instruction", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm payment intent", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load correct PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Recipient testnet address", { exact: true })
    .fill("invalid");
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Verify transaction", exact: true }),
  ).toBeDisabled();
});
test("imports independently sourced public prevout evidence through the normal UI", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await confirm(page);
  await page.getByLabel("Choose a PSBT file", { exact: true }).setInputFiles({
    name: "public-prevout-illustration.psbt",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(buildPublicPrevoutPsbt().toBuffer()),
  });
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".review-metrics")).toContainText("39,617");
});

test("handles speech success, permission denial, replay, stop and reset races", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__recognizers = [];
    w.__spoken = [];
    class Recognition {
      onresult: any;
      onerror: any;
      onend: any;
      lang = "";
      start() {
        w.__recognizers.push(this);
      }
      abort() {
        w.__aborts = (w.__aborts ?? 0) + 1;
      }
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: Recognition,
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel() {
          w.__cancels = (w.__cancels ?? 0) + 1;
        },
        getVoices() {
          return [{ lang: "en-IN" }];
        },
        speak(u: any) {
          w.__spoken.push(u.text);
          w.__utterance = u;
        },
      },
      configurable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
      configurable: true,
    });
  });
  await page.goto("/review?details=1");
  await page.getByLabel("Allow browser speech.", { exact: false }).check();
  await page.getByRole("button", { name: "Speak intent", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Speak intent", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => {
    (window as any).__recognizers.at(-1).onresult({
      results: [
        [
          {
            transcript: "Send fifty thousand sats to Riya",
            confidence: 0.95,
          },
        ],
      ],
    });
  });
  await expect(
    page.getByLabel("Payment instruction", { exact: true }),
  ).toHaveValue("Send fifty thousand sats to Riya");
  await page
    .getByRole("button", { name: "Confirm payment intent", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load tampered PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Transaction does not match",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hear this review", exact: true })
    .click();
  expect(await page.evaluate(() => (window as any).__spoken.at(-1))).toContain(
    "Do not sign",
  );
  await page.evaluate(() => {
    (window as any).__utterance.onend({});
  });
  await expect(page.locator(".audio-status")).toContainText(
    "Playback complete",
  );
  await page
    .getByRole("button", { name: "Hear this review", exact: true })
    .click();
  await page.getByRole("button", { name: "Stop audio", exact: true }).click();
  await expect(page.locator(".audio-status")).toContainText("Audio stopped");
  await page.getByRole("button", { name: "Speak intent", exact: true }).click();
  await page.evaluate(() => {
    const w = window as any;
    w.__late = w.__recognizers.at(-1).onresult;
  });
  await page
    .getByRole("button", { name: "Reset session", exact: true })
    .click();
  await page.evaluate(() => {
    (window as any).__late({
      results: [[{ transcript: "Send 500000 sats to Riya", confidence: 1 }]],
    });
  });
  await expect(
    page.getByLabel("Payment instruction", { exact: true }),
  ).toHaveValue("");
  await page.getByLabel("Allow browser speech.", { exact: false }).check();
  await page.getByRole("button", { name: "Speak intent", exact: true }).click();
  await page.evaluate(() => {
    (window as any).__recognizers.at(-1).onerror({ error: "not-allowed" });
  });
  await expect(page.getByRole("alert")).toContainText("editable transcript");
  await confirm(page);
});

test("supports teach-back and keeps manual transactions in memory without network uploads", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await page.goto("/review?details=1");
  await page
    .getByRole("button", { name: "Use demo phrase", exact: true })
    .click();
  await page
    .getByLabel("Help me double-check my understanding", { exact: true })
    .check();
  await page
    .getByLabel("Who receives the payment?", { exact: true })
    .selectOption("riya");
  await page.getByLabel("How many sats?", { exact: true }).fill("500000");
  await page
    .getByRole("button", { name: "Check my understanding", exact: true })
    .click();
  await expect(page.locator(".teach-back")).toContainText(
    "Those answers differ",
  );
  await page.getByLabel("How many sats?", { exact: true }).fill("50000");
  await page
    .getByRole("button", { name: "Check my understanding", exact: true })
    .click();
  await expect(page.locator(".teach-back")).toContainText("Correct");
  await page
    .getByRole("button", { name: "Confirm payment intent", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load correct PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookies: document.cookie,
    })),
  ).toEqual({ local: 0, session: 0, cookies: "" });
  expect(external).toEqual([]);
  await page.reload();
  await expect(
    page.getByLabel("Payment instruction", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toHaveCount(0);
});

test("is usable at mobile size with reduced motion and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/review?details=1");
  await confirm(page);
  await page
    .getByRole("button", { name: "Load correct PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await axe(page);
});

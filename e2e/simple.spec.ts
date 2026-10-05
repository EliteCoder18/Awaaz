import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function confirm(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Use demo phrase", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm payment intent", exact: true })
    .click();
}
test("silent simple review compares all money flows and can correct a mismatch", async ({
  page,
}) => {
  await page.goto("/review?flow=intent");
  await page.getByRole("button", { name: "Sound off", exact: true }).click();
  await expect(
    page.getByLabel("Choose a PSBT file", { exact: true }),
  ).toBeHidden();
  await confirm(page);
  await expect(page.locator("#transaction-heading")).toBeFocused();
  await page
    .getByRole("button", { name: "Load tampered PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByLabel("Picture payment receipt", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("DO NOT SIGN", { exact: true })).toBeVisible();
  await expect(page.getByLabel("To Riya", { exact: true })).toContainText(
    "0 sats",
  );
  await expect(
    page.getByLabel("Other payments", { exact: true }),
  ).toContainText("5,00,000 sats");
  await expect(
    page.getByRole("button", { name: "Hear this review", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".review-metrics")).toBeHidden();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("button", { name: "2 Bring the file", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Load correct PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByText("Instruction matches", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Total leaving", { exact: true })).toContainText(
    "51,000 sats",
  );
  await page
    .getByRole("button", { name: "Detailed view", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Payment instruction", { exact: true })
    .fill("Send 60000 sats to Riya");
  await page.getByRole("button", { name: "Simple view", exact: true }).click();
  await expect(
    page.getByLabel("Payment instruction", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Instruction matches", { exact: true }),
  ).toHaveCount(0);
});
test("optional narration reads the visible caption, stops, and obeys Sound off", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as { spoken: string[]; cancelled: number };
    state.spoken = [];
    state.cancelled = 0;
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {
          state.cancelled++;
        },
        getVoices() {
          return [{ lang: "en-IN" }];
        },
        speak(u: { text: string }) {
          state.spoken.push(u.text);
        },
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
  });
  await page.goto("/review?flow=intent");
  const visibleCaption = await page
    .locator(".step-guidance > p")
    .first()
    .innerText();
  await page
    .getByRole("button", { name: "Hear this step", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { spoken: string[] }).spoken),
    )
    .toEqual([visibleCaption]);
  await page.getByRole("button", { name: "Sound off", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sound off", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Hear this step", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel(/Allow browser speech/)).toBeDisabled();
  await confirm(page);
  await expect(
    page.getByLabel("Read my result aloud automatically", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Load correct PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByLabel("Picture payment receipt", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { spoken: string[] }).spoken,
    ),
  ).toEqual([visibleCaption]);
  expect(
    await page.evaluate(
      () => (window as unknown as { cancelled: number }).cancelled,
    ),
  ).toBeGreaterThan(0);
});
test("Hindi missing-evidence receipt is visual, readable on mobile and fails closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/review?flow=intent");
  await page.getByLabel("Language", { exact: true }).selectOption("hi-IN");
  await page.getByRole("button", { name: "आवाज़ बंद", exact: true }).click();
  await page
    .getByRole("button", { name: "डेमो वाक्य इस्तेमाल करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "भुगतान निर्देश की पुष्टि करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "अधूरे प्रमाण का PSBT लोड करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "लेन-देन सत्यापित करें", exact: true })
    .click();
  await expect(page.getByText("साइन न करें", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("अतिरिक्त शुल्क", { exact: true }),
  ).toContainText("अज्ञात");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("visual receipt separates the intended recipient from an extra unknown payment", async ({
  page,
}) => {
  await page.goto("/review?flow=intent");
  await confirm(page);
  await page
    .getByRole("button", { name: "Load extra payment PSBT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(page.getByText("DO NOT SIGN", { exact: true })).toBeVisible();
  await expect(page.getByLabel("To Riya", { exact: true })).toContainText(
    "50,000 sats",
  );
  await expect(
    page.getByLabel("Other payments", { exact: true }),
  ).toContainText("2,000 sats");
});

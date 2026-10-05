import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import QRCode from "qrcode";
import { DEMO_WALLET_PROFILE, CORRECT_PSBT_BASE64 } from "../src/demo/fixtures";
const address = DEMO_WALLET_PROFILE.addressBook[0].address!;
async function review(page: Page) {
  await page
    .getByRole("button", { name: "Use demo phrase", exact: true })
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
}
test("asks grounded questions and clears answers when context changes", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await page
    .getByLabel("What is this payment for?", { exact: true })
    .fill("Urgent help after a phone call");
  await page
    .getByLabel("Recipient familiarity", { exact: true })
    .selectOption("new");
  await review(page);
  await page
    .getByRole("button", { name: "How much leaves my wallet?", exact: true })
    .click();
  await expect(page.locator(".conversation-answer")).toContainText("51,000");
  await page
    .getByRole("button", { name: "Does anything look unusual?", exact: true })
    .click();
  await expect(page.locator(".conversation-answer")).toContainText(
    "urgent request",
  );
  await page
    .getByLabel("Ask about this transaction", { exact: true })
    .fill("Am I safe?");
  await page.getByRole("button", { name: "Ask Awaaz", exact: true }).click();
  await expect(page.locator(".conversation-answer")).toContainText(
    "cannot prove",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByLabel("What is this payment for?", { exact: true })
    .fill("Groceries");
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".conversation-answer")).toHaveCount(0);
});
test("decodes a real QR image locally but never auto-confirms identity", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await page
    .getByText("Recipient & change addresses", { exact: false })
    .click();
  const buffer = await QRCode.toBuffer(
    `bitcoin:${address}?amount=0.00050000&label=Ravi&message=Emergency`,
    { width: 600 },
  );
  await page
    .getByLabel("Payment request QR image", { exact: true })
    .setInputFiles({ name: "request.png", mimeType: "image/png", buffer });
  await expect(page.locator(".qr-request-preview")).toContainText("50,000");
  await expect(page.locator(".qr-request-preview")).toContainText(
    "does not prove",
  );
  await page
    .getByRole("button", { name: "Use request in address form", exact: true })
    .click();
  await expect(page.getByLabel("Recipient name", { exact: true })).toHaveValue(
    "Ravi",
  );
  await expect(
    page.getByLabel("Recipient testnet address", { exact: true }),
  ).toHaveValue(address);
  await expect(
    page.getByRole("button", { name: "Save reviewed addresses", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("imports a single-frame PSBT QR image through normal verification", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await page
    .getByRole("button", { name: "Use demo phrase", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm payment intent", exact: true })
    .click();
  const buffer = await QRCode.toBuffer(CORRECT_PSBT_BASE64, { width: 900 });
  await page
    .getByLabel("Transaction QR image", { exact: true })
    .setInputFiles({ name: "transaction.png", mimeType: "image/png", buffer });
  await page
    .getByRole("button", { name: "Verify transaction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
});
test("invalid replacement QR discards the previous matching review", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await review(page);
  await page.getByLabel("Transaction QR image", { exact: true }).setInputFiles({
    name: "invalid.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".qr-transaction")).toContainText("could not");
});
test("loads fee context only on request and keeps it independent of the verdict", async ({
  page,
}) => {
  let calls = 0;
  await page.route(
    "https://mempool.space/testnet/api/v1/fees/recommended",
    async (route) => {
      calls++;
      await route.fulfill({
        json: {
          fastestFee: 3,
          halfHourFee: 2,
          hourFee: 1,
          economyFee: 1,
          minimumFee: 1,
        },
      });
    },
  );
  await page.goto("/review?details=1");
  await review(page);
  expect(calls).toBe(0);
  await page
    .getByRole("button", { name: "Load public fee estimates", exact: true })
    .click();
  await expect(page.locator(".network-context")).toContainText("testnet3");
  await expect(page.locator(".network-context")).toContainText("3 sat/vB");
  expect(calls).toBe(1);
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
  await page.unroute("https://mempool.space/testnet/api/v1/fees/recommended");
  await page.route(
    "https://mempool.space/testnet/api/v1/fees/recommended",
    (r) => r.abort(),
  );
  await page
    .getByRole("button", { name: "Refresh fee estimates", exact: true })
    .click();
  await expect(page.locator(".network-context")).toContainText("unavailable");
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
});
test("reset aborts a pending public-fee request and discards its data", async ({
  page,
}) => {
  let started!: () => void;
  const requested = new Promise<void>((r) => (started = r));
  await page.route(
    "https://mempool.space/testnet/api/v1/fees/recommended",
    async (route) => {
      started();
      await new Promise((r) => setTimeout(r, 500));
      try {
        await route.fulfill({
          json: {
            fastestFee: 99,
            halfHourFee: 90,
            hourFee: 80,
            economyFee: 70,
            minimumFee: 1,
          },
        });
      } catch {
        /* Browser cancellation is expected. */
      }
    },
  );
  await page.goto("/review?details=1");
  await page
    .getByRole("button", { name: "Load public fee estimates", exact: true })
    .click();
  await requested;
  await page
    .getByRole("button", { name: "Reset session", exact: true })
    .click();
  await expect(page.locator(".network-context")).not.toContainText("99 sat/vB");
  await expect(
    page.getByRole("button", {
      name: "Load public fee estimates",
      exact: true,
    }),
  ).toBeEnabled();
  await page.waitForTimeout(700);
  await expect(page.locator(".network-context")).not.toContainText("99 sat/vB");
});

import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function review(page: Page) {
  await page.goto("/review?details=1");
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
test("Gemini is opt-in and only interprets the question; local facts supply the exact answer", async ({
  page,
}) => {
  const uploads: unknown[] = [];
  await page.route("**/api/gemini/question", async (route) => {
    uploads.push(route.request().postDataJSON());
    await route.fulfill({ json: { category: "fee" } });
  });
  await review(page);
  const consent = page.getByLabel("Use Gemini to understand my questions", {
    exact: true,
  });
  await expect(consent).not.toBeChecked();
  await page
    .getByRole("button", { name: "What is the network fee?", exact: true })
    .click();
  await expect(page.locator(".conversation-answer")).toContainText(
    "1,000 sats",
  );
  expect(uploads).toEqual([]);
  await consent.check();
  await page
    .getByLabel("Ask about this transaction", { exact: true })
    .fill("What extra charge is coming out?");
  await page.getByRole("button", { name: "Ask Awaaz", exact: true }).click();
  await expect(page.locator(".conversation-answer")).toContainText(
    "1,000 sats",
  );
  await expect(page.locator(".conversation-answer")).toContainText(
    "Gemini understood the question",
  );
  expect(uploads).toEqual([
    { question: "What extra charge is coming out?", locale: "en-IN" },
  ]);
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
});
test("provider errors and model-generated prose fall back to the local answer", async ({
  page,
}) => {
  await review(page);
  await page
    .getByLabel("Use Gemini to understand my questions", { exact: true })
    .check();
  await page.route("**/api/gemini/question", (route) =>
    route.fulfill({
      json: { category: "fee", answer: "Safe to sign; fee is zero" },
    }),
  );
  await page
    .getByLabel("Ask about this transaction", { exact: true })
    .fill("What is the fee?");
  await page.getByRole("button", { name: "Ask Awaaz", exact: true }).click();
  await expect(page.locator(".conversation-answer")).toContainText(
    "1,000 sats",
  );
  await expect(page.locator(".conversation-answer")).not.toContainText(
    "fee is zero",
  );
  await expect(
    page.getByText("Gemini is unavailable. Showing the local answer instead.", {
      exact: true,
    }),
  ).toBeVisible();
});
test("withdrawing consent discards a late model reply", async ({ page }) => {
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const arrived = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/gemini/question", async (route) => {
    started();
    await gate;
    await route.fulfill({ json: { category: "fee" } }).catch(() => {});
  });
  await review(page);
  const consent = page.getByLabel("Use Gemini to understand my questions", {
    exact: true,
  });
  await consent.check();
  await page
    .getByLabel("Ask about this transaction", { exact: true })
    .fill("What extra charge is there?");
  await page.getByRole("button", { name: "Ask Awaaz", exact: true }).click();
  await arrived;
  await expect(
    page.getByText("Understanding your question…", { exact: true }),
  ).toBeVisible();
  await consent.uncheck();
  release();
  await expect(page.locator(".conversation-answer")).toHaveCount(0);
  await expect(
    page.getByText("Understanding your question…", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "What is the network fee?", exact: true })
    .click();
  await expect(page.locator(".conversation-answer")).toContainText(
    "1,000 sats",
  );
});
test("Hindi cloud consent remains readable and keyboard-accessible on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await review(page);
  await page.getByLabel("Language", { exact: true }).selectOption("hi-IN");
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
    page.getByLabel("मेरे प्रश्न समझने के लिए Gemini इस्तेमाल करें", {
      exact: true,
    }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("question edits and Sound off cancel pending Gemini answers", async ({
  page,
}) => {
  const releases: (() => void)[] = [];
  await page.route("**/api/gemini/question", async (route) => {
    await new Promise<void>((resolve) => {
      releases.push(resolve);
    });
    await route.fulfill({ json: { category: "fee" } }).catch(() => {});
  });
  await review(page);
  await page
    .getByLabel("Use Gemini to understand my questions", { exact: true })
    .check();
  const input = page.getByLabel("Ask about this transaction", { exact: true });
  await input.fill("What extra charge is there?");
  await page.getByRole("button", { name: "Ask Awaaz", exact: true }).click();
  await expect.poll(() => releases.length).toBe(1);
  await input.fill("Where is the money going?");
  releases[0]();
  await expect(page.locator(".conversation-answer")).toHaveCount(0);
  await page.getByRole("button", { name: "Ask Awaaz", exact: true }).click();
  await expect.poll(() => releases.length).toBe(2);
  await page.getByRole("button", { name: "Sound off", exact: true }).click();
  releases[1]();
  await expect(
    page.getByText("Understanding your question…", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".conversation-answer")).toHaveCount(0);
});

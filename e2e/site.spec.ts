import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("dashboard leads to a real review and keeps it across navigation", async ({
  page,
}) => {
  await page.goto("/?flow=intent");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Understand your payment",
  );
  await page
    .getByRole("link", { name: "Review a payment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
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
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByLabel("Session readiness")).toContainText("MATCH");
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Transaction matches", exact: true }),
  ).toBeVisible();
  await page.goto("/review?flow=intent");
  await page.reload();
  await expect(
    page.getByLabel("Payment instruction", { exact: true }),
  ).toHaveValue("");
});
test("demo shortcut remains unconfirmed and all public pages work", async ({
  page,
}) => {
  await page.goto("/?flow=intent");
  await page
    .getByRole("link", { name: "Try the guided demo", exact: true })
    .click();
  await expect(
    page.getByLabel("Payment instruction", { exact: true }),
  ).toHaveValue("Send 50,000 sats to Riya");
  await expect(
    page.getByRole("button", {
      name: "Verify transaction",
      exact: true,
      includeHidden: true,
    }),
  ).toBeDisabled();
  for (const path of ["/guide", "/developers", "/unknown"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await page
      .getByRole("link", { name: "Skip to content", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#site-main")).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page
    .getByRole("link", { name: "Back to overview", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
});
test("dashboard works on keyboard, Hindi, mobile and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/?flow=intent");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByLabel("Site language", { exact: true }).selectOption("hi-IN");
  await expect(page.locator("h1")).toContainText("अपना भुगतान समझें");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Site language", { exact: true }).selectOption("en-IN");
  await page
    .getByRole("link", { name: "Review a payment", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/review$/);
});
test("review stacks at intermediate widths and themes the real empty state", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  for (const width of [901, 1024, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page
        .locator(".workspace-grid")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        ),
    ).toBe(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.locator(".review-panel")).toHaveCSS(
    "background-color",
    "rgb(255, 249, 233)",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("guided demo resets dirty settings but still requires confirmation", async ({
  page,
}) => {
  await page.goto("/review?details=1");
  await page.locator(".profile-settings > summary").click();
  await page.getByLabel("Recipient name", { exact: true }).fill("Maya");
  await page.getByLabel("Maximum total network fee", { exact: true }).fill("0");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByText(
      "Guided demo starts a fresh synthetic session and replaces current desk inputs.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Try the guided demo", exact: true })
    .click();
  await expect(
    page.getByLabel("Maximum total network fee", { exact: true }),
  ).toHaveValue("2000");
  await expect(
    page.getByRole("button", { name: "Verify transaction", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Confirm payment intent", exact: true })
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
});

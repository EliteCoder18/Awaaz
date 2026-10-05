import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("traditional bilingual display fonts are self-hosted across the site", async ({
  page,
}) => {
  const fontUrls: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontUrls.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCSS("font-family", /Yatra One/);
  await expect(page.locator(".page-intro > div > p").first()).toHaveCSS(
    "font-family",
    /Manrope/,
  );
  await page.evaluate(() => document.fonts.ready);
  expect(fontUrls.some((url) => url.includes("yatra-one-latin-400"))).toBe(
    true,
  );
  expect(fontUrls.some((url) => url.includes("manrope-latin-500"))).toBe(true);
  await page.getByLabel("Site language", { exact: true }).selectOption("hi-IN");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("h1")).toContainText("अपना भुगतान समझें");
  expect(fontUrls.some((url) => url.includes("yatra-one-devanagari-400"))).toBe(
    true,
  );
  expect(
    fontUrls.every((url) => new URL(url).origin === new URL(page.url()).origin),
  ).toBe(true);
  for (const route of ["/guide", "/developers", "/review"]) {
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCSS("font-family", /Yatra One/);
  }
});

test("artistic Hindi headings reflow on mobile while warnings and money stay clear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/review?flow=intent");
  await page.getByLabel("Language", { exact: true }).selectOption("hi-IN");
  await page
    .getByRole("button", { name: "डेमो वाक्य इस्तेमाल करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "भुगतान निर्देश की पुष्टि करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "बदला PSBT लोड करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "लेन-देन सत्यापित करें", exact: true })
    .click();
  await expect(page.getByText("साइन न करें", { exact: true })).toBeVisible();
  await expect(page.locator("#review-heading")).toHaveCSS(
    "font-family",
    /Yatra One/,
  );
  await expect(page.locator(".receipt-stop strong")).toHaveCSS(
    "font-family",
    /Manrope/,
  );
  await expect(page.locator(".receipt-pictures dd").first()).toHaveCSS(
    "font-family",
    /Manrope/,
  );
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

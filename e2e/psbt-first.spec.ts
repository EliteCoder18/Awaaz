import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { buildDemoPsbt } from "../src/demo/fixtures";

test("a person uploads a PSBT and sees a Hindi explanation before confirmation", async ({
  page,
}) => {
  await page.goto("/review");
  await expect(
    page.getByLabel("PSBT फ़ाइल चुनें", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("भुगतान निर्देश", { exact: true })).toBeHidden();
  await page.getByLabel("PSBT फ़ाइल चुनें", { exact: true }).setInputFiles({
    name: "wallet-payment.psbt",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(buildDemoPsbt("correct"), "base64"),
  });
  await expect(
    page.getByLabel("फ़ाइल का सरल हिसाब", { exact: true }),
  ).toContainText("50,000");
  await expect(
    page.getByLabel("नेटवर्क का शुल्क", { exact: true }),
  ).toContainText("1,000");
  await expect(
    page.getByText("wallet-payment.psbt", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: "अब देखें: क्या आप यही भुगतान चाहते हैं?",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "लेन-देन सत्यापित करें", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(/अभी आपके निर्देश से मेल नहीं जाँचा गया/),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("button", { name: "डेमो वाक्य इस्तेमाल करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "भुगतान निर्देश की पुष्टि करें", exact: true })
    .click();
  await page
    .getByRole("button", { name: "लेन-देन सत्यापित करें", exact: true })
    .click();
  await expect(
    page.getByText("निर्देश मेल खाता है", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("यह सुरक्षा की गारंटी नहीं है।", { exact: true }),
  ).toBeVisible();
});

test("missing evidence stays unknown in the Hindi explanation on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/review");
  await page.getByLabel("PSBT फ़ाइल चुनें", { exact: true }).setInputFiles({
    name: "missing.psbt",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(buildDemoPsbt("missing-evidence"), "base64"),
  });
  await expect(
    page.getByLabel("नेटवर्क का शुल्क", { exact: true }),
  ).toContainText("पता नहीं चल पाया");
  await expect(
    page.getByText(/अभी आपके निर्देश से मेल नहीं जाँचा गया/),
  ).toContainText("साइन न करें");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "आवाज़ बंद", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "यह हिसाब हिंदी में सुनें", exact: true }),
  ).toBeDisabled();
});

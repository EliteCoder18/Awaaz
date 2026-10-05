import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PictureReceipt } from "./PictureReceipt";
import type { VerificationReport } from "../core/types";
const report = (params: Record<string, string>): VerificationReport => ({
  verdict: "INCOMPLETE",
  issues: [],
  summaryKey: "incomplete",
  speakableParameters: params,
});
it("never invents a zero fee or payment when evidence is missing", () => {
  render(<PictureReceipt report={report({})} locale="en-IN" />);
  for (const name of [
    "Other payments",
    "Extra fee",
    "Total leaving",
    "Configured change",
  ])
    expect(screen.getByLabelText(name)).toHaveTextContent("Unknown");
  expect(screen.getByText("DO NOT SIGN", { exact: true })).toBeVisible();
});
it("uses exact bigint arithmetic for additional recipients and does not certify change ownership", () => {
  render(
    <PictureReceipt
      report={report({
        recipient: "Riya",
        expectedAmount: "50000",
        recipientAmount: "50000",
        externalAmount: "55000",
        fee: "1000",
        debit: "56000",
        change: "944000",
      })}
      locale="en-IN"
    />,
  );
  expect(screen.getByLabelText("To Riya")).toHaveTextContent("50,000 sats");
  expect(screen.getByLabelText("Other payments")).toHaveTextContent(
    "5,000 sats",
  );
  expect(screen.getByLabelText("Total leaving")).toHaveTextContent(
    "56,000 sats",
  );
  expect(screen.getByText(/ownership is not proven/)).toBeVisible();
});
it("does not display a negative additional payment from inconsistent facts", () => {
  render(
    <PictureReceipt
      report={report({
        recipientAmount: "50000",
        externalAmount: "40000",
        fee: "unknown",
      })}
      locale="hi-IN"
    />,
  );
  expect(screen.getByLabelText("दूसरे पते पर भुगतान")).toHaveTextContent(
    "अज्ञात",
  );
  expect(screen.getByLabelText("अतिरिक्त शुल्क")).toHaveTextContent("अज्ञात");
});
it("does not present witness-only claimed fees as a verified charge", () => {
  const incomplete = report({
    recipient: "Riya",
    recipientAmount: "50000",
    externalAmount: "50000",
    fee: "1000",
    debit: "51000",
  });
  incomplete.issues = [
    { code: "MISSING_PREVOUT_EVIDENCE", severity: "warning" },
  ];
  render(<PictureReceipt report={incomplete} locale="en-IN" />);
  expect(screen.getByLabelText("Extra fee")).toHaveTextContent("Unknown");
  expect(screen.getByLabelText("Total leaving")).toHaveTextContent("Unknown");
});

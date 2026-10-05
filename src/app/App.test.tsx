import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { App } from "./App";
import { runReview } from "../core/runReview";
// jsdom has no Worker; use the real deterministic review core at that boundary.
vi.mock("../adapters/verificationClient", () => ({
  runVerification: (snapshot: Parameters<typeof runReview>[0]) =>
    runReview(snapshot),
}));
describe("Awaaz complete flow", () => {
  it("requires explicit intent confirmation, detects tampering, then matches a correction", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /use demo phrase/i }));
    expect(
      screen.getByRole("button", { name: /verify transaction/i }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: /confirm payment intent/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /load tampered psbt/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /verify transaction/i }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Transaction does not match",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/expected 50,000 sats, actual 5,00,000 sats/i, {
        selector: "li",
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /load correct psbt/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /verify transaction/i }),
    );
    expect(
      await screen.findByRole("heading", { name: "Transaction matches" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/payment instruction/i), " edited");
    expect(
      screen.queryByRole("heading", { name: "Transaction matches" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /verify transaction/i }),
    ).toBeDisabled();
  });
  it("keeps a manual path when recognition is unavailable", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText(/allow browser speech/i));
    await user.click(screen.getByRole("button", { name: /speak intent/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /editable transcript/i,
    );
    expect(screen.getByLabelText(/payment instruction/i)).toBeEnabled();
  });
  it("clears everything on reset", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /use demo phrase/i }));
    await user.click(screen.getByRole("button", { name: /reset session/i }));
    expect(screen.getByLabelText(/payment instruction/i)).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /verify transaction/i }),
    ).toBeDisabled();
  });
});

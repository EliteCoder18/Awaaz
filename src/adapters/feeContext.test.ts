import { it, expect } from "vitest";
import { fetchFeeContext, isFeeContextFresh } from "./feeContext";
it("fetches only public testnet estimates and records provenance", async () => {
  const calls: string[] = [];
  const fake = async (input: string, options: RequestInit) => {
    calls.push(input);
    expect(options.body).toBeUndefined();
    return new Response(
      JSON.stringify({
        fastestFee: 3,
        halfHourFee: 2,
        hourFee: 1,
        economyFee: 1,
        minimumFee: 1,
      }),
      { status: 200 },
    );
  };
  const facts = await fetchFeeContext(
    new AbortController().signal,
    fake as typeof fetch,
  );
  expect(calls).toEqual([
    "https://mempool.space/testnet/api/v1/fees/recommended",
  ]);
  expect(facts.chain).toBe("testnet3");
  expect(facts.hourFee).toBe(1);
  expect(isFeeContextFresh(facts)).toBe(true);
  expect(isFeeContextFresh({ ...facts, fetchedAt: 0 })).toBe(false);
});
it("rejects malformed provider data rather than fabricating fees", async () => {
  await expect(
    fetchFeeContext(
      new AbortController().signal,
      async () => new Response(JSON.stringify({ hourFee: -1 })),
    ),
  ).rejects.toThrow();
});

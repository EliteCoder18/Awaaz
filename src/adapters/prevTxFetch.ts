import { fromHex } from "../core/encoding";

export const PREV_TX_SOURCE = "https://mempool.space/testnet/api/tx/";

export interface FetchedProof {
  txid: string;
  bytes: Uint8Array;
  source: "mempool.space" | "demo";
}

// Fetches raw previous transactions by txid. The source is untrusted:
// validatePrevouts later re-hashes every transaction against the input's txid.
export async function fetchPreviousTransactions(
  txids: string[],
  signal: AbortSignal,
  local: (txid: string) => Uint8Array | undefined = () => undefined,
  fetcher: typeof fetch = fetch,
): Promise<FetchedProof[]> {
  if (txids.length > 100) throw new Error("Too many inputs to fetch.");
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(abort, 8000);
  try {
    return await Promise.all(
      txids.map(async (txid): Promise<FetchedProof> => {
        if (!/^[0-9a-f]{64}$/i.test(txid)) throw new Error("Invalid txid.");
        const demo = local(txid);
        if (demo) return { txid, bytes: demo, source: "demo" };
        const response = await fetcher(PREV_TX_SOURCE + txid + "/hex", {
          method: "GET",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Previous transaction not found.");
        const text = (await response.text()).trim();
        if (text.length > 2_000_000 || !/^(?:[0-9a-f]{2})+$/i.test(text))
          throw new Error("Invalid previous transaction response.");
        return { txid, bytes: fromHex(text), source: "mempool.space" };
      }),
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

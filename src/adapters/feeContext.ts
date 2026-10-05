export interface FeeContext {
  chain: "testnet3";
  source: string;
  fetchedAt: number;
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}
const SOURCE = "https://mempool.space/testnet/api/v1/fees/recommended";
export async function fetchFeeContext(
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<FeeContext> {
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher(SOURCE, {
      method: "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Fee estimates unavailable.");
    const data = await response.json();
    if (controller.signal.aborted) throw new Error("Fee request cancelled.");
    for (const key of [
      "fastestFee",
      "halfHourFee",
      "hourFee",
      "economyFee",
      "minimumFee",
    ]) {
      if (
        typeof data[key] !== "number" ||
        !Number.isFinite(data[key]) ||
        data[key] < 0 ||
        data[key] > 1000000
      )
        throw new Error("Invalid fee provider response.");
    }
    return {
      chain: "testnet3",
      source: SOURCE,
      fetchedAt: Date.now(),
      fastestFee: data.fastestFee,
      halfHourFee: data.halfHourFee,
      hourFee: data.hourFee,
      economyFee: data.economyFee,
      minimumFee: data.minimumFee,
    };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
export function isFeeContextFresh(data: FeeContext, now = Date.now()): boolean {
  return now >= data.fetchedAt && now - data.fetchedAt < 5 * 60 * 1000;
}

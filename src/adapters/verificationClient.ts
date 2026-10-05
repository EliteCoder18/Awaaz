import type { ReviewResult, ReviewSnapshot } from "../core/types";
export type WorkerFactory = () => Worker;
export function runVerification(
  snapshot: ReviewSnapshot,
  signal: AbortSignal,
  factory: WorkerFactory = () =>
    new Worker(new URL("./verificationWorker.ts", import.meta.url), {
      type: "module",
    }),
  timeoutMs = 2000,
): Promise<ReviewResult> {
  if (signal.aborted)
    return Promise.reject(new DOMException("Review cancelled.", "AbortError"));
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = factory();
    } catch {
      reject(
        new Error(
          "Transaction processing is unavailable. Open Awaaz in desktop Chrome.",
        ),
      );
      return;
    }
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      action();
    };
    const abort = () =>
      finish(() => reject(new DOMException("Review cancelled.", "AbortError")));
    const timer = setTimeout(
      () =>
        finish(() =>
          reject(
            new Error(
              "Transaction processing timed out. Try a smaller supported PSBT.",
            ),
          ),
        ),
      timeoutMs,
    );
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = (
      event: MessageEvent<{ result?: ReviewResult; error?: string }>,
    ) =>
      finish(() =>
        event.data.result
          ? resolve(event.data.result)
          : reject(new Error(event.data.error ?? "Verification failed.")),
      );
    worker.onerror = () =>
      finish(() =>
        reject(new Error("The transaction worker failed. Retry the import.")),
      );
    try {
      worker.postMessage(snapshot);
    } catch {
      finish(() => reject(new Error("Unable to prepare transaction data.")));
    }
  });
}

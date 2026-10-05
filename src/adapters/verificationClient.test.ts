import { describe, expect, it, vi, afterEach } from "vitest";
import { runVerification } from "./verificationClient";
import type { ReviewSnapshot, ReviewResult } from "../core/types";
const snapshot = {} as ReviewSnapshot;
function fakeWorker() {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
  } as unknown as Worker;
}
afterEach(() => vi.useRealTimers());
describe("bounded verification worker", () => {
  it("terminates on abort and removes late message handlers", async () => {
    const worker = fakeWorker(),
      abort = new AbortController();
    const promise = runVerification(snapshot, abort.signal, () => worker);
    const check = expect(promise).rejects.toMatchObject({ name: "AbortError" });
    abort.abort();
    await check;
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.onmessage).toBeNull();
  });
  it("terminates on the two-second deadline", async () => {
    vi.useFakeTimers();
    const worker = fakeWorker();
    const promise = runVerification(
      snapshot,
      new AbortController().signal,
      () => worker,
    );
    const check = expect(promise).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(2000);
    await check;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("resolves the current result and cleans up", async () => {
    const worker = fakeWorker(),
      result = { receipt: { revision: 3 } } as ReviewResult;
    const promise = runVerification(
      snapshot,
      new AbortController().signal,
      () => worker,
    );
    worker.onmessage?.({ data: { result } } as MessageEvent);
    await expect(promise).resolves.toEqual(result);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("rejects worker failure without a verdict", async () => {
    const worker = fakeWorker();
    const promise = runVerification(
      snapshot,
      new AbortController().signal,
      () => worker,
    );
    worker.onerror?.({} as ErrorEvent);
    await expect(promise).rejects.toThrow("worker failed");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("does not allocate a worker for cancelled work", async () => {
    const factory = vi.fn(),
      abort = new AbortController();
    abort.abort();
    await expect(
      runVerification(snapshot, abort.signal, factory),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(factory).not.toHaveBeenCalled();
  });
});

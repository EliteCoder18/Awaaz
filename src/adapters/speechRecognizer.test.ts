import { afterEach, describe, expect, it, vi } from "vitest";

import { recognizeSpeech } from "./speechRecognizer";

describe("recognizeSpeech", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a speech result from an injected browser recognizer", async () => {
    const result = await recognizeSpeech("hi-IN", () => ({
      lang: "",
      continuous: true,
      interimResults: true,
      maxAlternatives: 2,
      onresult: null,
      onerror: null,
      onend: null,
      start() {
        this.onresult?.({
          results: [
            [{ transcript: "रिया को ५०,००० सैट्स भेजो", confidence: 0.91 }],
          ],
        });
      },
      abort() {},
    }));

    expect(result).toMatchObject({
      transcript: "रिया को ५०,००० सैट्स भेजो",
      locale: "hi-IN",
      confidence: 0.91,
      source: "speech",
    });
  });

  it("returns a typed unsupported error for the transcript fallback", async () => {
    await expect(
      recognizeSpeech("en-IN", () => undefined),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED",
    });
  });

  it("returns a typed permission error when microphone access is denied", async () => {
    await expect(
      recognizeSpeech("en-IN", () => ({
        lang: "",
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
        onresult: null,
        onerror: null,
        onend: null,
        start() {
          this.onerror?.({ error: "not-allowed" });
        },
        abort() {},
      })),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("aborts recognition and returns a timeout error after silence", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const promise = recognizeSpeech(
      "en-IN",
      () => ({
        lang: "",
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
        onresult: null,
        onerror: null,
        onend: null,
        start() {},
        abort() {
          aborted = true;
        },
      }),
      50,
    );
    const rejection = expect(promise).rejects.toMatchObject({
      code: "TIMEOUT",
    });

    await vi.advanceTimersByTimeAsync(50);

    await rejection;
    expect(aborted).toBe(true);
  });

  it("returns TIMEOUT even when abort synchronously triggers onend", async () => {
    vi.useFakeTimers();
    const promise = recognizeSpeech(
      "en-IN",
      () => ({
        lang: "",
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
        onresult: null,
        onerror: null,
        onend: null,
        start() {},
        abort() {
          this.onend?.();
        },
      }),
      50,
    );
    const rejection = expect(promise).rejects.toMatchObject({
      code: "TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(50);
    await rejection;
  });
  it("cancels a pending recording through AbortSignal", async () => {
    const controller = new AbortController();
    const promise = recognizeSpeech(
      "en-IN",
      () => ({
        lang: "",
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
        onresult: null,
        onerror: null,
        onend: null,
        start() {},
        abort() {
          this.onend?.();
        },
      }),
      10000,
      controller.signal,
    );
    const rejection = expect(promise).rejects.toMatchObject({
      code: "CANCELLED",
    });
    controller.abort();
    await rejection;
  });
});

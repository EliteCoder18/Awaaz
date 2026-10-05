import { describe, expect, it, vi } from "vitest";

import { speakLocalizedReport } from "./speechSynthesis";
import type { UtteranceLike } from "./speechSynthesis";

describe("speakLocalizedReport", () => {
  it("reports completed playback and selects a locale-compatible voice", () => {
    const completed = vi.fn(),
      utterance: UtteranceLike = { text: "", lang: "" };
    const voice = { lang: "hi-IN" } as SpeechSynthesisVoice;
    const synthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: () => [voice],
    };
    expect(
      speakLocalizedReport(
        { title: "", instruction: "", details: [], speech: "साइन न करें" },
        "hi-IN",
        synthesis,
        () => utterance,
        undefined,
        completed,
      ),
    ).toBe(true);
    expect(utterance.voice).toBe(voice);
    utterance.onend?.({} as SpeechSynthesisEvent);
    expect(completed).toHaveBeenCalledOnce();
  });
  it("never substitutes an English voice for unavailable Hindi", () => {
    const synthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: () => [{ lang: "en-US" } as SpeechSynthesisVoice],
    };
    expect(
      speakLocalizedReport(
        { title: "", instruction: "", details: [], speech: "साइन न करें" },
        "hi-IN",
        synthesis,
        () => ({ text: "", lang: "" }),
      ),
    ).toBe(false);
    expect(synthesis.speak).not.toHaveBeenCalled();
  });
  it("speaks the same text contained in the localized report", () => {
    const spoken: Array<{ text: string; lang: string }> = [];

    speakLocalizedReport(
      {
        title: "Transaction does not match",
        instruction: "Do not sign.",
        details: [],
        speech: "Transaction does not match. Do not sign.",
      },
      "en-IN",
      {
        cancel() {},
        speak(utterance) {
          spoken.push({ text: utterance.text, lang: utterance.lang });
        },
      },
      (text) => ({ text, lang: "" }),
    );

    expect(spoken).toEqual([
      {
        text: "Transaction does not match. Do not sign.",
        lang: "en-IN",
      },
    ]);
  });
});

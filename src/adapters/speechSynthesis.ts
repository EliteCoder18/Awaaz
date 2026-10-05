import type { LocalizedReport, Locale } from "../core/types";

export interface UtteranceLike {
  text: string;
  lang: string;
  rate?: number;
  voice?: SpeechSynthesisVoice | null;
  onerror?: ((event: SpeechSynthesisErrorEvent) => void) | null;
  onend?: ((event: SpeechSynthesisEvent) => void) | null;
}

export interface SpeechSynthesisLike {
  cancel(): void;
  speak(utterance: UtteranceLike): void;
  getVoices?(): SpeechSynthesisVoice[];
}

export type UtteranceFactory = (text: string) => UtteranceLike;

function browserSynthesis(): SpeechSynthesisLike | undefined {
  if (typeof window === "undefined" || !window.speechSynthesis)
    return undefined;
  return window.speechSynthesis as unknown as SpeechSynthesisLike;
}

function browserUtterance(text: string): UtteranceLike {
  return new SpeechSynthesisUtterance(text);
}

export function speakLocalizedReport(
  report: LocalizedReport,
  locale: Locale,
  synthesis: SpeechSynthesisLike | undefined = browserSynthesis(),
  createUtterance: UtteranceFactory = browserUtterance,
  onError?: () => void,
  onEnd?: () => void,
  rate = 0.9,
): boolean {
  if (!synthesis) {
    return false;
  }
  const voices = synthesis.getVoices?.();
  const voice =
    voices?.find((v) => v.lang.toLowerCase() === locale.toLowerCase()) ??
    voices?.find((v) => v.lang.toLowerCase().startsWith(locale.slice(0, 2)));
  if (voices && !voice) return false;

  const utterance = createUtterance(report.speech);
  utterance.lang = locale;
  utterance.rate = rate;
  if (voice) utterance.voice = voice;
  if (onError) utterance.onerror = onError;
  if (onEnd) utterance.onend = onEnd;
  synthesis.cancel();
  synthesis.speak(utterance);
  return true;
}

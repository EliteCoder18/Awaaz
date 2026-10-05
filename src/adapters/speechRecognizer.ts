import type { Locale, SpeechResult } from "../core/types";

export interface RecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface RecognitionEventLike {
  results: ArrayLike<ArrayLike<RecognitionAlternativeLike>>;
}

export interface RecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface BrowserRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

export type RecognitionFactory = () => BrowserRecognitionLike | undefined;

export type SpeechRecognitionErrorCode =
  | "UNSUPPORTED"
  | "PERMISSION_DENIED"
  | "NO_MATCH"
  | "TIMEOUT"
  | "CANCELLED"
  | "RECOGNITION_ERROR";

export class SpeechRecognitionError extends Error {
  constructor(
    public readonly code: SpeechRecognitionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SpeechRecognitionError";
  }
}

function defaultFactory(): BrowserRecognitionLike | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const speechWindow = window as typeof window & {
    SpeechRecognition?: new () => BrowserRecognitionLike;
    webkitSpeechRecognition?: new () => BrowserRecognitionLike;
  };
  const Constructor =
    speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  return Constructor ? new Constructor() : undefined;
}

export function recognizeSpeech(
  locale: Locale,
  factory: RecognitionFactory = defaultFactory,
  timeoutMs = 10_000,
  signal?: AbortSignal,
): Promise<SpeechResult> {
  if (signal?.aborted)
    return Promise.reject(
      new SpeechRecognitionError("CANCELLED", "Recording cancelled."),
    );
  let recognition: BrowserRecognitionLike | undefined;
  try {
    recognition = factory();
  } catch {
    return Promise.reject(
      new SpeechRecognitionError(
        "RECOGNITION_ERROR",
        "Speech recognition could not start.",
      ),
    );
  }
  if (!recognition) {
    return Promise.reject(
      new SpeechRecognitionError(
        "UNSUPPORTED",
        "Speech recognition is unavailable in this browser.",
      ),
    );
  }

  recognition.lang = locale;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
      recognition.onresult = recognition.onerror = recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* Cleanup must not prevent settlement. */
      }
      action();
    };
    const cancel = () =>
      finish(() =>
        reject(new SpeechRecognitionError("CANCELLED", "Recording cancelled.")),
      );
    const timeout = window.setTimeout(() => {
      finish(() =>
        reject(
          new SpeechRecognitionError(
            "TIMEOUT",
            "No speech was recognized before the timeout.",
          ),
        ),
      );
    }, timeoutMs);
    signal?.addEventListener("abort", cancel, { once: true });

    recognition.onresult = (event) => {
      const alternative = event.results[0]?.[0];
      if (!alternative?.transcript.trim()) {
        finish(() =>
          reject(
            new SpeechRecognitionError("NO_MATCH", "No speech was recognized."),
          ),
        );
        return;
      }

      finish(() =>
        resolve({
          transcript: alternative.transcript.trim(),
          locale,
          confidence: alternative.confidence,
          source: "speech",
        }),
      );
    };
    recognition.onerror = (event) => {
      const permissionDenied =
        event.error === "not-allowed" || event.error === "service-not-allowed";
      finish(() =>
        reject(
          new SpeechRecognitionError(
            permissionDenied ? "PERMISSION_DENIED" : "RECOGNITION_ERROR",
            event.message ?? `Speech recognition failed: ${event.error}.`,
          ),
        ),
      );
    };
    recognition.onend = () => {
      finish(() =>
        reject(
          new SpeechRecognitionError("NO_MATCH", "No speech was recognized."),
        ),
      );
    };

    try {
      recognition.start();
    } catch {
      finish(() =>
        reject(
          new SpeechRecognitionError(
            "RECOGNITION_ERROR",
            "Speech recognition could not start. Use the editable transcript.",
          ),
        ),
      );
    }
  });
}

import type { Locale } from "../core/types";
import { postAi } from "./aiClient";

let current:
  | { controller: AbortController; audio?: HTMLAudioElement; url?: string }
  | undefined;

export function stopCloudVoice() {
  if (!current) return;
  current.controller.abort();
  current.audio?.pause();
  if (current.url) URL.revokeObjectURL(current.url);
  current = undefined;
}

// Natural OpenAI voice for text that is already verified (template or
// Number-Locked explanation). Resolves when playback ends.
export async function speakCloud(
  text: string,
  locale: Locale,
  rate = 0.9,
): Promise<void> {
  stopCloudVoice();
  const mine: NonNullable<typeof current> = {
    controller: new AbortController(),
  };
  current = mine;
  const clipped =
    text.length > 1500 ? text.slice(0, 1500).replace(/[^।.!?]*$/, "") : text;
  const response = await postAi(
    "/api/ai/speak",
    { text: clipped, locale },
    mine.controller.signal,
    30000,
  );
  const blob = await response.blob();
  if (current !== mine) return;
  mine.url = URL.createObjectURL(blob);
  mine.audio = new Audio(mine.url);
  mine.audio.playbackRate = Math.min(1.3, Math.max(0.7, rate / 0.9));
  await new Promise<void>((resolve, reject) => {
    const audio = mine.audio!;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Playback failed."));
    mine.controller.signal.addEventListener("abort", () => resolve(), {
      once: true,
    });
    audio.play().catch(reject);
  });
  if (current === mine) stopCloudVoice();
}

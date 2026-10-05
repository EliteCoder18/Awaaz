import type { Locale, SpeechResult } from "../core/types";
import { postAiJson } from "./aiClient";

const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function cloudSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

// Records one instruction (stops after ~1.5 s of silence, on `stop`, or at
// maxMs) and transcribes it with OpenAI through the server route.
export async function recognizeCloudSpeech(
  locale: Locale,
  signal: AbortSignal,
  stop?: AbortSignal,
  maxMs = 15000,
): Promise<SpeechResult> {
  if (!cloudSpeechSupported()) throw new Error("Recording is not supported.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  const chunks: Blob[] = [];
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  context.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  let heard = false,
    quietSince = 0;
  const blob = await new Promise<Blob>((resolve, reject) => {
    const finish = () => recorder.state !== "inactive" && recorder.stop();
    const timer = setTimeout(finish, maxMs);
    const poll = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += (v - 128) ** 2;
      const loud = Math.sqrt(sum / samples.length) > 6;
      if (loud) {
        heard = true;
        quietSince = 0;
      } else if (heard) {
        quietSince ||= Date.now();
        if (Date.now() - quietSince > 1500) finish();
      }
    }, 100);
    const cleanup = () => {
      clearTimeout(timer);
      clearInterval(poll);
      stream.getTracks().forEach((t) => t.stop());
      void context.close();
      signal.removeEventListener("abort", onAbort);
      stop?.removeEventListener("abort", finish);
    };
    const onAbort = () => {
      cleanup();
      if (recorder.state !== "inactive") recorder.stop();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    stop?.addEventListener("abort", finish, { once: true });
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      if (signal.aborted) return;
      cleanup();
      resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
    };
    recorder.onerror = () => {
      cleanup();
      reject(new Error("Recording failed."));
    };
    recorder.start(250);
  });
  if (!blob.size) throw new Error("No speech was recorded.");
  if (blob.size > 1_500_000) throw new Error("Recording is too long.");
  const data = (await postAiJson(
    "/api/ai/transcribe",
    {
      audioBase64: toBase64(new Uint8Array(await blob.arrayBuffer())),
      mimeType: blob.type.split(";")[0],
      locale,
    },
    signal,
    35000,
  )) as { transcript?: unknown };
  if (typeof data.transcript !== "string" || !data.transcript.trim())
    throw new Error("No speech was recognized.");
  return { transcript: data.transcript.trim(), locale, source: "speech" };
}

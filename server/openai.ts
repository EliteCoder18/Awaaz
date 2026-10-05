import { readLimited } from "./http.js";
import { ProviderConfigError } from "./endpoint.js";

const API = "https://api.openai.com/v1";

export function openaiConfig() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ProviderConfigError("Set OPENAI_API_KEY on the server.");
  return {
    key,
    model: process.env.OPENAI_MODEL || "gpt-6-luna",
    transcribeModel:
      process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe",
    ttsModel: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
    voice: process.env.OPENAI_TTS_VOICE || "marin",
  };
}

function linked(signal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  return {
    signal: controller.signal,
    done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    },
  };
}

// Structured JSON call through the Responses API. Returns the parsed object;
// callers must still validate every field.
export async function callOpenAI(
  {
    instructions,
    input,
    schemaName,
    schema,
    maxOutputTokens = 1200,
    timeoutMs = 20000,
  }: {
    instructions: string;
    input: unknown;
    schemaName: string;
    schema: Record<string, unknown>;
    maxOutputTokens?: number;
    timeoutMs?: number;
  },
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const config = openaiConfig();
  const call = linked(signal, timeoutMs);
  try {
    const response = await fetcher(API + "/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.key,
      },
      signal: call.signal,
      body: JSON.stringify({
        model: config.model,
        store: false,
        input: [
          { role: "system", content: instructions },
          { role: "user", content: JSON.stringify(input) },
        ],
        text: {
          format: { type: "json_schema", name: schemaName, schema, strict: true },
        },
        max_output_tokens: maxOutputTokens,
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Provider unavailable.");
    }
    const data = JSON.parse(await readLimited(response, 65536, call.signal));
    if (data.status !== "completed") throw new Error("Incomplete response.");
    const message = (data.output as { type: string; content?: unknown[] }[])
      ?.find((item) => item.type === "message");
    const part = (message?.content as { type: string; text?: string }[])?.find(
      (c) => c.type === "output_text",
    );
    if (typeof part?.text !== "string") throw new Error("No output text.");
    return JSON.parse(part.text);
  } finally {
    call.done();
  }
}

export async function transcribe(
  audio: Uint8Array,
  mimeType: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const config = openaiConfig();
  const call = linked(signal, 30000);
  try {
    const form = new FormData();
    const ext = mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("ogg")
        ? "ogg"
        : mimeType.includes("wav")
          ? "wav"
          : "webm";
    form.append("file", new Blob([audio], { type: mimeType }), "speech." + ext);
    form.append("model", config.transcribeModel);
    form.append(
      "prompt",
      "A short Hindi, English or Hinglish instruction to send Bitcoin, for example: Riya ko 50,000 sats bhejo.",
    );
    const response = await fetcher(API + "/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + config.key },
      signal: call.signal,
      body: form,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Transcription unavailable.");
    }
    const data = JSON.parse(await readLimited(response, 16384, call.signal));
    if (typeof data.text !== "string") throw new Error("No transcript.");
    return data.text.trim().slice(0, 500);
  } finally {
    call.done();
  }
}

export async function speak(
  text: string,
  locale: "en-IN" | "hi-IN",
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Uint8Array> {
  const config = openaiConfig();
  const call = linked(signal, 30000);
  try {
    const response = await fetcher(API + "/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.key,
      },
      signal: call.signal,
      body: JSON.stringify({
        model: config.ttsModel,
        voice: config.voice,
        input: text,
        response_format: "mp3",
        instructions:
          locale === "hi-IN"
            ? "Speak in warm, clear, natural Hindi at a calm pace, like a patient helper. Read numbers carefully."
            : "Speak in warm, clear Indian English at a calm pace, like a patient helper. Read numbers carefully.",
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Speech unavailable.");
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > 5_000_000) throw new Error("Audio too large.");
    return buffer;
  } finally {
    call.done();
  }
}

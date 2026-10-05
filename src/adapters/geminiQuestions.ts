import type { Locale } from "../core/types";
import {
  readQuestionCategory,
  type QuestionCategory,
} from "../core/questionCategories";

export async function routeGeminiQuestion(
  question: string,
  locale: Locale,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<QuestionCategory> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(abort, 18000);
  try {
    const response = await fetcher("/api/gemini/question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, locale }),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error("Gemini question understanding is unavailable.");
    if (controller.signal.aborted) throw new Error("Question cancelled.");
    return readQuestionCategory(await response.json());
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

import { readConversationPlan, type ConversationRequest } from "../core/conversationTopics";

export async function routeOpenAIConversation(request: ConversationRequest, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const controller = new AbortController(), abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(abort, 18000);
  try {
    const response = await fetcher("/api/openai/conversation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store",
      body: JSON.stringify(request), signal: controller.signal,
    });
    if (!response.ok) throw new Error("OpenAI conversation is unavailable.");
    const plan = readConversationPlan(await response.json());
    if (controller.signal.aborted) throw new Error("Question cancelled.");
    return plan;
  } finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}

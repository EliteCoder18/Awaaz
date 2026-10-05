// Same-origin POST to the server-side AI routes (keys never reach the browser).
export async function postAi(
  path: string,
  body: unknown,
  signal: AbortSignal,
  timeoutMs = 25000,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetcher(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("AI is unavailable right now.");
    return response;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export async function postAiJson(
  path: string,
  body: unknown,
  signal: AbortSignal,
  timeoutMs?: number,
): Promise<unknown> {
  const response = await postAi(path, body, signal, timeoutMs);
  return response.json();
}

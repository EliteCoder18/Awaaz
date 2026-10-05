// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createServer, request, type Server } from "node:http";
import { classifyQuestion, createGeminiMiddleware } from "../../server/gemini";

const servers: Server[] = [];
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});
function provider(output: unknown, status = 200) {
  return async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              role: "model",
              parts: [{ text: JSON.stringify(output) }],
            },
            finishReason: "STOP",
          },
        ],
      }),
      { status },
    );
}
async function start(options: Parameters<typeof createGeminiMiddleware>[0]) {
  const handler = createGeminiMiddleware(options);
  const server = createServer((req, res) => void handler(req, res));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return {
    server,
    origin,
    ask: (
      body: unknown = { question: "What is the fee?", locale: "en-IN" },
      headers: Record<string, string> = {},
      method = "POST",
    ) =>
      fetch(`${origin}/api/gemini/question`, {
        method,
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          ...headers,
        },
        ...(method === "POST"
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      }),
  };
}
it("only submits the question and locale to the fixed model and returns a category", async () => {
  let payload: unknown;
  const category = await classifyQuestion(
    "मेरे पैसे में और क्या कटेगा?",
    "hi-IN",
    "test-only-secret",
    new AbortController().signal,
    async (url, options) => {
      expect(url).toBe(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      );
      expect(new Headers(options?.headers).get("x-goog-api-key")).toBe(
        "test-only-secret",
      );
      payload = JSON.parse(options!.body as string);
      return provider({ category: "fee" })();
    },
  );
  expect(category).toBe("fee");
  expect(
    JSON.parse(
      (payload as { contents: { parts: { text: string }[] }[] }).contents[0]
        .parts[0].text,
    ),
  ).toEqual({ question: "मेरे पैसे में और क्या कटेगा?", locale: "hi-IN" });
});
it.each([
  { category: "MATCH" },
  { category: "fee", answer: "Safe to sign" },
  { category: 1 },
  null,
])("rejects untrusted model output %j", async (output) => {
  await expect(
    classifyQuestion(
      "fee?",
      "en-IN",
      "test-only-secret",
      new AbortController().signal,
      provider(output),
    ),
  ).rejects.toThrow();
});
it("does not expose credential or provider errors to the browser", async () => {
  const { ask } = await start({
    apiKey: "test-only-secret",
    fetcher: async () =>
      new Response("secret-provider-details", { status: 429 }),
  });
  const response = await ask();
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    error: "Gemini is unavailable. Use local questions.",
  });
});
it("rejects cross-origin, wrong-method and non-JSON requests before provider use", async () => {
  const { ask } = await start({
    apiKey: "test-only-secret",
    fetcher: async () => {
      throw new Error("Provider must not be contacted");
    },
  });
  expect(
    (await ask(undefined, { Origin: "https://evil.example" })).status,
  ).toBe(403);
  expect((await ask(undefined, { Origin: "" })).status).toBe(403);
  expect(
    (
      await ask(undefined, {
        Host: "attacker.example",
        Origin: "http://attacker.example",
      })
    ).status,
  ).toBe(403);
  expect((await ask(undefined, {}, "GET")).status).toBe(405);
  expect((await ask(undefined, { "Content-Type": "text/plain" })).status).toBe(
    415,
  );
});
it.each([
  { question: "", locale: "en-IN" },
  { question: "x".repeat(301), locale: "en-IN" },
  { question: "fee?", locale: "fr-FR" },
  { question: "fee?", locale: "en-IN", psbt: "must-never-upload" },
  "not json",
])("rejects invalid client payload %j", async (body) => {
  const { ask } = await start({
    apiKey: "test-only-secret",
    fetcher: provider({ category: "fee" }),
  });
  expect((await ask(body)).status).toBe(400);
});
it("rejects oversized uploads and missing configuration", async () => {
  const { ask } = await start({
    apiKey: "test-only-secret",
    fetcher: provider({ category: "fee" }),
  });
  expect((await ask("x".repeat(2049))).status).toBe(413);
  const missing = await start({ fetcher: provider({ category: "fee" }) });
  expect((await missing.ask()).status).toBe(503);
});
it("limits the eleventh request without disclosing the key", async () => {
  const { ask } = await start({
    apiKey: "test-only-secret",
    fetcher: provider({ category: "fee" }),
  });
  for (let i = 0; i < 10; i++) {
    const response = await ask();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ category: "fee" });
  }
  expect((await ask()).status).toBe(429);
});
it("aborts upstream on caller cancellation", async () => {
  const controller = new AbortController();
  const result = classifyQuestion(
    "fee?",
    "en-IN",
    "test-only-secret",
    controller.signal,
    async (_url, options) =>
      new Promise<Response>((_resolve, reject) =>
        options!.signal!.addEventListener("abort", () =>
          reject(new Error("aborted")),
        ),
      ),
  );
  controller.abort();
  await expect(result).rejects.toThrow();
});
it("times out a stalled provider", async () => {
  vi.useFakeTimers();
  const result = classifyQuestion(
    "fee?",
    "en-IN",
    "test-only-secret",
    new AbortController().signal,
    async (_url, options) =>
      new Promise<Response>((_resolve, reject) =>
        options!.signal!.addEventListener("abort", () =>
          reject(new Error("timeout")),
        ),
      ),
  );
  const rejected = expect(result).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(15000);
  await rejected;
});
it("limits concurrent requests and aborts upstream when the HTTP caller leaves", async () => {
  let started = 0;
  let aborted = 0;
  const releases: (() => void)[] = [];
  const { origin, ask } = await start({
    apiKey: "test-only-secret",
    fetcher: async (_url, options) =>
      new Promise<Response>((resolve, reject) => {
        started++;
        releases.push(() => void provider({ category: "fee" })().then(resolve));
        options!.signal!.addEventListener("abort", () => {
          aborted++;
          reject(new Error("aborted"));
        });
      }),
  });
  const controller = new AbortController();
  const first = fetch(`${origin}/api/gemini/question`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ question: "fee?", locale: "en-IN" }),
    signal: controller.signal,
  });
  const firstRejected = expect(first).rejects.toThrow();
  const second = ask();
  await vi.waitFor(() => expect(started).toBe(2));
  expect((await ask()).status).toBe(429);
  controller.abort();
  await firstRejected;
  await vi.waitFor(() => expect(aborted).toBe(1));
  releases.forEach((release) => release());
  expect((await second).status).toBe(200);
});
it("does not admit an eleventh provider call when request bodies finish together", async () => {
  const { origin, ask, server } = await start({
    apiKey: "test-only-secret",
    fetcher: provider({ category: "fee" }),
  });
  for (let i = 0; i < 9; i++) expect((await ask()).status).toBe(200);
  let incoming = 0;
  server.on("request", () => incoming++);
  const pending = [0, 1].map(() => {
    let req!: ReturnType<typeof request>;
    const response = new Promise<number>((resolve, reject) => {
      req = request(
        `${origin}/api/gemini/question`,
        {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode!));
        },
      );
      req.on("error", reject);
      req.write('{"question":');
    });
    return { req, response };
  });
  await vi.waitFor(() => expect(incoming).toBe(2));
  pending.forEach(({ req }) => req.end('"fee?","locale":"en-IN"}'));
  expect((await Promise.all(pending.map((p) => p.response))).sort()).toEqual([
    200, 429,
  ]);
});
it("stops reading an oversized provider stream before buffering its whole body", async () => {
  let receivedBytes = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      receivedBytes += 4096;
      controller.enqueue(new Uint8Array(4096));
      if (receivedBytes >= 102400) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  await expect(
    classifyQuestion(
      "fee?",
      "en-IN",
      "test-only-secret",
      new AbortController().signal,
      async () => new Response(body),
    ),
  ).rejects.toThrow();
  expect(cancelled).toBe(true);
  expect(receivedBytes).toBeLessThanOrEqual(24576);
});

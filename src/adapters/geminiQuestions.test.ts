import { expect, it } from "vitest";
import { routeGeminiQuestion } from "./geminiQuestions";

it("uploads only the explicitly asked question and locale to the same-origin backend", async () => {
  const category = await routeGeminiQuestion(
    "What extra charge is there?",
    "en-IN",
    new AbortController().signal,
    async (url, options) => {
      expect(url).toBe("/api/gemini/question");
      expect(JSON.parse(options!.body as string)).toEqual({
        question: "What extra charge is there?",
        locale: "en-IN",
      });
      return new Response(JSON.stringify({ category: "fee" }));
    },
  );
  expect(category).toBe("fee");
});
it.each([
  { category: "fee", verdict: "MATCH" },
  { category: "sign" },
  { answer: "500000" },
])("rejects non-category replies %j", async (body) => {
  await expect(
    routeGeminiQuestion(
      "What extra charge is there?",
      "en-IN",
      new AbortController().signal,
      async () => new Response(JSON.stringify(body)),
    ),
  ).rejects.toThrow();
});
it("rejects failure without accepting server prose as an answer", async () => {
  await expect(
    routeGeminiQuestion(
      "fee?",
      "en-IN",
      new AbortController().signal,
      async () => new Response("unsafe upstream prose", { status: 502 }),
    ),
  ).rejects.toThrow();
});

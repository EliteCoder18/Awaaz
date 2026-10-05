import type { IncomingMessage, ServerResponse } from "node:http";
import { createOpenAIConversationMiddleware } from "../../server/openaiConversation.js";
import { BodyError, sameOriginRequest } from "../../server/gemini.js";

const handle = createOpenAIConversationMiddleware({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_CONVERSATION_MODEL,
  allowRequest: sameOriginRequest,
  readBody: async (req) => {
    if (Number(req.headers["content-length"] ?? 0) > 8192) throw new BodyError(413);
    const body = (req as IncomingMessage & { body?: unknown }).body;
    const text = typeof body === "string" ? body : Buffer.isBuffer(body) ? body.toString("utf8") : JSON.stringify(body ?? null);
    if (Buffer.byteLength(text) > 8192) throw new BodyError(413);
    return text;
  },
});
export default function handler(req: IncomingMessage, res: ServerResponse) { return handle(req, res); }

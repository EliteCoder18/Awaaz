import type { IncomingMessage, ServerResponse } from "node:http";
import {
  BodyError,
  createGeminiMiddleware,
  sameOriginRequest,
} from "../../server/gemini.js";

// Vercel buffers the request body before calling the function, so read the
// helper-provided `req.body` instead of the (already consumed) stream.
async function readVercelBody(req: IncomingMessage): Promise<string> {
  if (Number(req.headers["content-length"] ?? 0) > 2048)
    throw new BodyError(413);
  let body: unknown;
  try {
    body = (req as IncomingMessage & { body?: unknown }).body;
  } catch {
    throw new BodyError(400);
  }
  const text =
    typeof body === "string"
      ? body
      : Buffer.isBuffer(body)
        ? body.toString("utf8")
        : JSON.stringify(body ?? null);
  if (Buffer.byteLength(text) > 2048) throw new BodyError(413);
  return text;
}

const handle = createGeminiMiddleware({
  apiKey: process.env.GEMINI_API_KEY,
  allowRequest: sameOriginRequest,
  readBody: readVercelBody,
});

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handle(req, res);
}

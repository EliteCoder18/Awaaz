import type { IncomingMessage, ServerResponse } from "node:http";

// Reads a provider response body with a hard byte limit and strict UTF-8.
export async function readLimited(
  response: Response,
  limit: number,
  signal: AbortSignal,
): Promise<string> {
  if (
    !response.body ||
    Number(response.headers.get("content-length") ?? 0) > limit
  ) {
    await response.body?.cancel();
    throw new Error("Invalid provider response.");
  }
  const reader = response.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Invalid provider response.");
      chunks.push(value);
    }
    if (signal.aborted) throw new Error("Question cancelled.");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}


export function loopbackRequest(req: IncomingMessage): boolean {
  try {
    const origin = new URL(req.headers.origin ?? "");
    return (
      origin.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) &&
      origin.origin === `http://${req.headers.host}` &&
      ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
        req.socket.remoteAddress ?? "",
      )
    );
  } catch {
    return false;
  }
}
// Deployed (HTTPS) same-origin check, used by the Vercel function.
export function sameOriginRequest(req: IncomingMessage): boolean {
  try {
    const origin = new URL(req.headers.origin ?? "");
    const host = req.headers["x-forwarded-host"] ?? req.headers.host;
    return origin.protocol === "https:" && origin.host === host;
  } catch {
    return false;
  }
}
export function send(res: ServerResponse, status: number, data: unknown) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}
export class BodyError extends Error {
  constructor(public status: number) {
    super("Invalid request.");
  }
}
export function readStreamBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<string> {
  if (Number(req.headers["content-length"] ?? 0) > maxBytes)
    return Promise.reject(new BodyError(413));
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    const clean = () => {
      clearTimeout(timer);
      req.off("data", data);
      req.off("end", end);
      req.off("error", error);
      req.off("aborted", error);
    };
    const fail = (status: number) => {
      clean();
      req.resume();
      reject(new BodyError(status));
    };
    const data = (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) fail(413);
      else chunks.push(chunk);
    };
    const end = () => {
      clean();
      resolve(Buffer.concat(chunks).toString("utf8"));
    };
    const error = () => fail(400);
    const timer = setTimeout(() => fail(408), 10000);
    req.on("data", data);
    req.on("end", end);
    req.on("error", error);
    req.on("aborted", error);
  });
}


// Vercel buffers the request body before calling the function, so read the
// helper-provided `req.body` instead of the (already consumed) stream.
export async function readVercelBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<string> {
  if (Number(req.headers["content-length"] ?? 0) > maxBytes)
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
  if (Buffer.byteLength(text) > maxBytes) throw new BodyError(413);
  return text;
}

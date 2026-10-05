import type { IncomingMessage, ServerResponse } from "node:http";
import { BodyError, loopbackRequest, readStreamBody, send } from "./http.js";

export interface BinaryResult {
  binary: Uint8Array;
  contentType: string;
}
export interface EndpointSpec<I> {
  validate(body: unknown): I;
  run(input: I, signal: AbortSignal): Promise<unknown | BinaryResult>;
  perMinute: number;
  concurrent: number;
  maxBody: number;
}
export class ProviderConfigError extends Error {}

const isBinary = (value: unknown): value is BinaryResult =>
  typeof value === "object" &&
  value !== null &&
  (value as BinaryResult).binary instanceof Uint8Array;

// Shared request guard for every AI route: same-origin only, POST + JSON,
// bounded body, per-instance rate and concurrency limits, abort on disconnect.
export function createEndpoint<I>(
  spec: EndpointSpec<I>,
  {
    allowRequest = loopbackRequest,
    readBody = readStreamBody,
    now = Date.now,
  }: {
    allowRequest?: (req: IncomingMessage) => boolean;
    readBody?: (req: IncomingMessage, maxBytes: number) => Promise<string>;
    now?: () => number;
  } = {},
) {
  let windowStart = now(),
    requests = 0,
    active = 0;
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (!allowRequest(req))
      return send(res, 403, { error: "Same-origin requests only." });
    if (req.method !== "POST")
      return send(res, 405, { error: "POST required." });
    if (
      req.headers["content-type"]?.split(";")[0].trim() !== "application/json"
    )
      return send(res, 415, { error: "JSON required." });
    if (now() - windowStart >= 60000) {
      windowStart = now();
      requests = 0;
    }
    if (requests >= spec.perMinute || active >= spec.concurrent)
      return send(res, 429, { error: "Too many AI requests. Try again soon." });
    requests++;
    active++;
    const controller = new AbortController(),
      abort = () => controller.abort();
    req.on("aborted", abort);
    res.on("close", abort);
    try {
      let input: I;
      try {
        input = spec.validate(JSON.parse(await readBody(req, spec.maxBody)));
      } catch (error) {
        throw error instanceof BodyError ? error : new BodyError(400);
      }
      const result = await spec.run(input, controller.signal);
      if (controller.signal.aborted || res.destroyed || res.writableEnded)
        return;
      if (isBinary(result)) {
        res.writeHead(200, {
          "Content-Type": result.contentType,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        });
        res.end(Buffer.from(result.binary));
      } else send(res, 200, result);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof BodyError)
        send(res, error.status, { error: "Invalid request." });
      else if (error instanceof ProviderConfigError)
        send(res, 503, { error: error.message });
      else send(res, 502, { error: "AI is unavailable right now." });
    } finally {
      active--;
      req.off("aborted", abort);
      res.off("close", abort);
    }
  };
}

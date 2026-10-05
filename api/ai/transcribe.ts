import type { IncomingMessage, ServerResponse } from "node:http";
import { transcribeSpec } from "../../server/ai.js";
import { createEndpoint } from "../../server/endpoint.js";
import { readVercelBody, sameOriginRequest } from "../../server/http.js";

const handle = createEndpoint(transcribeSpec, {
  allowRequest: sameOriginRequest,
  readBody: readVercelBody,
});

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handle(req, res);
}

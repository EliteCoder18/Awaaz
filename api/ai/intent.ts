import type { IncomingMessage, ServerResponse } from "node:http";
import { intentSpec } from "../../server/ai.js";
import { createEndpoint } from "../../server/endpoint.js";
import { readVercelBody, sameOriginRequest } from "../../server/http.js";

const handle = createEndpoint(intentSpec, {
  allowRequest: sameOriginRequest,
  readBody: readVercelBody,
});

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handle(req, res);
}

import type { Plugin } from "vite";
import { createGeminiMiddleware } from "./gemini.ts";
import { AI_ROUTES } from "./ai.ts";
import { createEndpoint } from "./endpoint.ts";

// Mounts the same API routes Vercel serves from api/ on the Vite dev and
// preview servers (loopback-only).
export function geminiPlugin(apiKey?: string): Plugin {
  const install = (server: {
    middlewares: {
      use: (
        handler: (
          req: import("node:http").IncomingMessage,
          res: import("node:http").ServerResponse,
          next: () => void,
        ) => void,
      ) => void;
    };
  }) => {
    const gemini = createGeminiMiddleware({ apiKey });
    const routes = new Map(
      Object.entries(AI_ROUTES).map(([path, spec]) => [
        path,
        createEndpoint(spec as Parameters<typeof createEndpoint>[0]),
      ]),
    );
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split("?")[0] ?? "";
      if (path === "/api/gemini/question") return void gemini(req, res);
      const route = routes.get(path);
      if (route) return void route(req, res);
      next();
    });
  };
  return {
    name: "awaaz-local-api",
    configureServer: install,
    configurePreviewServer: install,
  };
}

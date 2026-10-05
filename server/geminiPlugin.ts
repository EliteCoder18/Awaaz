import type { Plugin } from "vite";
import { createGeminiMiddleware } from "./gemini.ts";

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
    const handle = createGeminiMiddleware({ apiKey });
    server.middlewares.use((req, res, next) => {
      if (req.url?.split("?")[0] !== "/api/gemini/question") return next();
      void handle(req, res);
    });
  };
  return {
    name: "awaaz-local-gemini",
    configureServer: install,
    configurePreviewServer: install,
  };
}

import type { Plugin } from "vite";
import { createOpenAIConversationMiddleware } from "./openaiConversation.ts";

export function openaiConversationPlugin(apiKey?: string, model?: string): Plugin {
  const install = (server: { middlewares: { use: (handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => void) => void } }) => {
    const handle = createOpenAIConversationMiddleware({ apiKey, model });
    server.middlewares.use((req, res, next) => {
      if (req.url?.split("?")[0] !== "/api/openai/conversation") return next();
      void handle(req, res);
    });
  };
  return { name: "awaaz-openai-conversation", configureServer: install, configurePreviewServer: install };
}

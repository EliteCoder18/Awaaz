import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { geminiPlugin } from "./server/geminiPlugin.ts";
import { openaiConversationPlugin } from "./server/openaiConversationPlugin.ts";

export default defineConfig(({ mode }) => {
  // Server-only OpenAI settings for the local API routes (never VITE_*).
  const openai = loadEnv(mode, process.cwd(), "OPENAI_");
  Object.assign(process.env, openai);
  return {
    plugins: [
      react(),
      geminiPlugin(loadEnv(mode, process.cwd(), "GEMINI_").GEMINI_API_KEY),
      openaiConversationPlugin(
        openai.OPENAI_API_KEY,
        openai.OPENAI_CONVERSATION_MODEL || undefined,
      ),
    ],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});

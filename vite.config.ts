import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { geminiPlugin } from "./server/geminiPlugin.ts";

export default defineConfig(({ mode }) => {
  // Server-only OpenAI settings for the local API routes (never VITE_*).
  Object.assign(process.env, loadEnv(mode, process.cwd(), "OPENAI_"));
  return {
    plugins: [
      react(),
      geminiPlugin(loadEnv(mode, process.cwd(), "GEMINI_").GEMINI_API_KEY),
    ],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});

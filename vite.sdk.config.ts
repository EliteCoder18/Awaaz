import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist-sdk",
    lib: { entry: "src/sdk/index.ts", formats: ["es"], fileName: "awaaz" },
    rolldownOptions: { external: ["bitcoinjs-lib"] },
  },
});

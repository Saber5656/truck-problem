import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { createLocalDecisionPlugin } from "./server/local-api-plugin.mjs";

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const env = loadEnv(mode, root, 'TYPESAFE_');
  return {
    build: {
      outDir: "dist/client",
    },
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      allowedHosts: ["localhost"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    preview: {
      host: "127.0.0.1",
      port: 4174,
      strictPort: true,
      allowedHosts: ["localhost"],
    },
    plugins: [react(), createLocalDecisionPlugin({ apiKey: env.TYPESAFE_API_KEY })],
  };
});

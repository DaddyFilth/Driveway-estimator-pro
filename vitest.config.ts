import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["server/**/*.test.ts", "client/src/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.early.test/**",
      "agent-client-protocol/**",
      "cubic/**",
      "easy-asphalt/**",
    ],
    globals: true,
    environment: "node",
    alias: {
      server: path.resolve(projectRoot, "./server"),
    },
  },
});

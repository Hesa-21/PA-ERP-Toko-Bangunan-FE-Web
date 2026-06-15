import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "app/api/**/*.test.ts",
      "app/api/**/*.test.tsx",
    ],
    clearMocks: true,
    fileParallelism: false,
    maxWorkers: 1,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "testing_scripts/server-only-shim.ts"),
    },
  },
})

import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "app/reports/sales/**/*.test.ts",
      "app/reports/sales/**/*.test.tsx",
      "app/sales/**/*.test.ts",
      "app/sales/**/*.test.tsx",
      "app/purchases/**/*.test.ts",
      "app/purchases/**/*.test.tsx",
      "app/returns/**/*.test.ts",
      "app/returns/**/*.test.tsx",
      "app/products/**/*.test.ts",
      "app/products/**/*.test.tsx",
      "app/dashboard/**/*.test.ts",
      "app/dashboard/**/*.test.tsx",
      "app/pos/**/*.test.ts",
      "app/pos/**/*.test.tsx",
      "app/users/**/*.test.ts",
      "app/users/**/*.test.tsx",
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

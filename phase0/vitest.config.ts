import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@drizzle": path.resolve(import.meta.dirname, "drizzle"),
    },
  },
  test: {
    root: ".",
    include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
    setupFiles: ["server/test/setup-env.ts"],
    globalSetup: ["server/test/global-setup.ts"],
    // DB tests do many round-trips to a remote test database (TiDB, us-east-1).
    testTimeout: 90_000,
    hookTimeout: 120_000,
    // DB tests share one test database; run files one at a time.
    fileParallelism: false,
  },
});

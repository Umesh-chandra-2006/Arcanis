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
    include: ["server/**/*.test.ts"],
    environment: "node",
  },
});
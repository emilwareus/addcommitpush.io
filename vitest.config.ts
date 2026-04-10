import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["internal/tools/researcher/__tests__/**/*.spec.ts"],
    passWithNoTests: true,
  },
});

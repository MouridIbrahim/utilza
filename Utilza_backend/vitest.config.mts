import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 15000,
    // Forces NODE_ENV=test before app modules load (dotenv never overrides
    // an existing value), enabling relaxed test rate limits + silent logs.
    env: { NODE_ENV: "test" },
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["dist/**", "node_modules/**"],
    // testTimeout: 10000, // Uncomment to increase the default timeout
    isolate: false, // Your test shouldn't have side effects doing this will improve performance.
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 85,
        functions: 80,
        statements: 75,
        branches: 50,
      },
    },
  },
});

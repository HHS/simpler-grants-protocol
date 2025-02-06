import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/**/*.d.ts", "!src/__tests__/**/*.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/__tests__/integration/"],
};

export default config;

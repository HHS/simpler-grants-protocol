// @ts-check
import eslint from "@eslint/js";
import tsEslint from "typescript-eslint";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-plugin-prettier";

export default [
  {
    ignores: ["dist/**/*", "node_modules/**/*", "coverage/**/*", ".wrangler/**/*"],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  {
    plugins: {
      prettier,
    },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
];

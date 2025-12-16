// @ts-check
const eslint = require("@eslint/js");
const tsEslint = require("typescript-eslint");
const vitest = require("@vitest/eslint-plugin");
const prettier = require("eslint-plugin-prettier");

module.exports = [
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "coverage/**/*",
      "generated/**/*",
      "eslint.config.js",
      "vitest.config.ts",
    ],
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

// @ts-check
const eslint = require("@eslint/js");
const tsEslint = require("typescript-eslint");
const jest = require("eslint-plugin-jest");
const prettier = require("eslint-plugin-prettier");

module.exports = [
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "coverage/**/*",
      "eslint.config.js",
      "jest.config.ts",
    ],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    plugins: {
      jest,
    },
    rules: {
      ...jest.configs.recommended.rules,
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

// @ts-check
const eslint = require("@eslint/js");
const tsEslint = require("typescript-eslint");
const prettier = require("eslint-plugin-prettier");

module.exports = [
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "coverage/**/*",
      "eslint.config.js",
      "vitest.config.ts",
    ],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        // This is necessary to resolve the tsconfig.json file
        tsconfigRootDir: __dirname,
      },
    },
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

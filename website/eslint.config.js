import globals from "globals";
import pluginJs from "@eslint/js";
import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { languageOptions: { globals: globals.node } },
  {
    ignores: [
      // Ignore items that are also gitignored
      "dist/", // Where generated build files are stored
      "node_modules/", // Where JavaScript libraries are installed
      "*.min.js", // All minified files
      ".astro/", // Astro generated code
      // Generated cache files
      "cache/",
    ],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
];

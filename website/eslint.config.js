import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  {
    ignores: [
      // Ignore items that are also gitignored
      "dist/", // Where generated build files are stored
      "node_modules/", // Where JavaScript libraries are installed
      "*.min.js", // All minified files
      ".astro/", // Astro generated code
    ],
  },
  pluginJs.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  ...tseslint.configs.recommended,
];

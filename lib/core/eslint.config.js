import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.node } },
  {
    ignores: [
      // Ignore items that are also gitignored
      "dist/", // Where generated build files are stored
      "node_modules/", // Where JavaScript libraries are installed
      "*.min.js", // All minified files
      ".tsp-output/", // TypeSpec generated code
    ],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];

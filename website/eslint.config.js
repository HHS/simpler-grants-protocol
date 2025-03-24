import globals from "globals";
import pluginJs from "@eslint/js";
import eslintPluginAstro from "eslint-plugin-astro";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts,astro}"] },
  { languageOptions: { globals: globals.node } },
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
  // TODO: Add typescript-eslint back in after troubleshooting how
  // to get it to work with the astro plugin
];

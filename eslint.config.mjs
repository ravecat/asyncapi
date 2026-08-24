import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      ".nx/**",
      "coverage/**",
      "tmp/**",
      "src/**/__snapshots__/**",
      "test/**/__snapshots__/**",
      "**/test/fixtures/corpus/cases/*/expected/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/src/**/*.ts", "**/test/**/*.ts", "**/test/**/*.mjs", "**/scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-console": "off",
    },
  },
];

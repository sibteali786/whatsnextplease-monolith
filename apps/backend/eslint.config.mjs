import { config as baseConfig } from "@repo/eslint-config/base";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(...baseConfig, {
  files: ["**/*.ts"],
  languageOptions: {
    globals: globals.node, // Use node globals for backend
    parserOptions: {
      project: true, // Enable type-aware linting
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    // Explicitly set no-explicit-any to error to match CI behavior
    "@typescript-eslint/no-explicit-any": "error",
  },
});
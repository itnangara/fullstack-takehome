import js from "@eslint/js";
import next from "@next/eslint-plugin-next";
import globals from "globals";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "node:url";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/.next/**", "functions/lib/**", "**/coverage/**", "web/next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    plugins: { "@next/next": next },
    settings: { next: { rootDir: fileURLToPath(new URL("./web/", import.meta.url)) } },
  },
  {
    files: ["web/src/**/*.tsx"],
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
    },
  },
);

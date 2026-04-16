import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Audit 2026-04-14 #12 — block stray console.log in shipped code.
  // We allow `console.warn` and `console.error` because they're often gated
  // behind `process.env.NODE_ENV !== "production"` for genuine debug paths
  // (see ProfileForm avatar upload, ParticipationsClient pagination, etc.).
  // `console.log` is forbidden everywhere so it can never leak in prod.
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Backend has its own toolchain (tsc only, no Next ESLint context).
    "backend/**",
  ]),
]);

export default eslintConfig;

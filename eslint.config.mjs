import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated or vendored artifacts are not application source. ESLint's
    // default file discovery otherwise scans stale bundles and local builds.
    ".vercel/**",
    ".ds-sync/**",
    "ds-bundle/**",
    ".design-sync/**",
    "test-results/**",
    "coverage/**",
    ".verify-artifacts/**",
  ]),
]);

export default eslintConfig;

// @ts-nocheck
import { defineConfig } from "eslint/config";

import baseConfig, { restrictEnvAccess } from "@acme/eslint-config/base";
import nextjsConfig from "@acme/eslint-config/nextjs";
import reactConfig from "@acme/eslint-config/react";

export default defineConfig(
  {
    ignores: [
      ".next/**",
      "convex/_generated/**",
      "src/app/blog/**",
      "src/components/blog/**",
      "src/content/blog/**",
      "src/app/test/**",
    ],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);

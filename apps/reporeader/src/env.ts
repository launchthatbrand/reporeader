import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

export const env = createEnv({
  extends: [vercel()],
  shared: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  server: {
    GITHUB_TOKEN: z.string().min(1).optional(),
    GITHUB_API_BASE_URL: z.url().optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GITVIDEO_GEMINI_MODEL: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1).optional().default("localhost"),
    NEXT_PUBLIC_AUTH_DEBUG_OVERLAY: z.string().optional(),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    NEXT_PUBLIC_AUTH_DEBUG_OVERLAY: process.env.NEXT_PUBLIC_AUTH_DEBUG_OVERLAY,
  },
  skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});


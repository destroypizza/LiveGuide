import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.string().optional(),
  WEB_ORIGIN: z.string().optional(),
  COMMAND_RATE_LIMIT_MS: z.string().optional()
});

export function readEnv() {
  const raw = EnvSchema.parse(process.env);
  const port = Number.parseInt(raw.PORT || "4000", 10);
  const webOrigin = raw.WEB_ORIGIN || "http://localhost:3000";
  const commandRateLimitMs = Number.parseInt(raw.COMMAND_RATE_LIMIT_MS || "1000", 10);
  return {
    port,
    webOrigin,
    commandRateLimitMs
  };
}


import { z } from 'zod';

export const EnvSchema = z.object({
  HOST: z.string(),
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'provision'])
    .default('development'),
  PORT: z.coerce.number(),
  ALLOW_CORS_URL: z.string().url(),
  ACCESS_TOKEN_SECRET: z.string().min(10).max(128),
  ACCESS_TOKEN_EXPIRATION: z.string().min(1).max(60),
  REFRESH_TOKEN_SECRET: z.string().min(10).max(128),
  REFRESH_TOKEN_EXPIRATION: z.string().min(1).max(365),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  RESEND_API_KEY: z.string().default(''),
  MAIL_FROM: z.string().default('onboarding@resend.dev'),
  FILE_MAX_SIZE: z.coerce.number().default(20971520),
});

/**
 * Type representing validated environment variables.
 */
export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates a configuration object against the environment schema.
 *
 * @param {Record<string, unknown>} config - The configuration object to validate.
 * @returns {Env} The validated and typed environment variables.
 * @throws {Error} If validation fails.
 */
export const validateEnv = (config: Record<string, unknown>): Env => {
  const validate = EnvSchema.safeParse(config);
  if (!validate.success) {
    throw new Error(validate.error.message);
  }
  return validate.data;
};

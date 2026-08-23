import { z } from 'zod';

export const authConfigSchema = z.object({
  maxDevicesPerUser: z.number().int().min(1).max(10).default(2),
  sessionTimeoutDays: z.number().int().min(1).max(90).default(3),
  accessTokenExpirationMinutes: z.number().int().min(5).max(1440).default(15),
  refreshTokenExpirationDays: z.number().int().min(1).max(365).default(30),
});

export const uiConfigSchema = z.object({
  signInCardMaxWidth: z.string().default('24rem'),
  signInCardPadding: z.string().default('1.5rem'),
  formGap: z.string().default('1.25rem'),
  inputGap: z.string().default('0.5rem'),
  buttonHeight: z.string().default('2.5rem'),
});

export const appConfigSchema = z.object({
  name: z.string().default('Technical Pilot LMS'),
  version: z.string().default('1.0.0'),
  logoUrl: z.string().url().default(''),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
export type UiConfig = z.infer<typeof uiConfigSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;

const defaultAuthConfig: AuthConfig = {
  maxDevicesPerUser: 2,
  sessionTimeoutDays: 3,
  accessTokenExpirationMinutes: 15,
  refreshTokenExpirationDays: 30,
};

const defaultUiConfig: UiConfig = {
  signInCardMaxWidth: '24rem',
  signInCardPadding: '1.5rem',
  formGap: '1.25rem',
  inputGap: '0.5rem',
  buttonHeight: '2.5rem',
};

const defaultAppConfig: AppConfig = {
  name: 'Technical Pilot LMS',
  version: '1.0.0',
  logoUrl: '',
};

function parseEnvNumber(envVar: string | undefined, fallback: number): number {
  if (!envVar) return fallback;
  const parsed = parseInt(envVar, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function getAuthConfig(): AuthConfig {
  return {
    maxDevicesPerUser: parseEnvNumber(process.env.MAX_DEVICES_PER_USER, defaultAuthConfig.maxDevicesPerUser),
    sessionTimeoutDays: parseEnvNumber(process.env.SESSION_TIMEOUT_DAYS, defaultAuthConfig.sessionTimeoutDays),
    accessTokenExpirationMinutes: parseEnvNumber(
      process.env.ACCESS_TOKEN_EXPIRATION_MINUTES,
      defaultAuthConfig.accessTokenExpirationMinutes
    ),
    refreshTokenExpirationDays: parseEnvNumber(
      process.env.REFRESH_TOKEN_EXPIRATION_DAYS,
      defaultAuthConfig.refreshTokenExpirationDays
    ),
  };
}

function getUiConfig(): UiConfig {
  return {
    signInCardMaxWidth: process.env.SIGN_IN_CARD_MAX_WIDTH ?? defaultUiConfig.signInCardMaxWidth,
    signInCardPadding: process.env.SIGN_IN_CARD_PADDING ?? defaultUiConfig.signInCardPadding,
    formGap: process.env.FORM_GAP ?? defaultUiConfig.formGap,
    inputGap: process.env.INPUT_GAP ?? defaultUiConfig.inputGap,
    buttonHeight: process.env.BUTTON_HEIGHT ?? defaultUiConfig.buttonHeight,
  };
}

function getAppConfig(): AppConfig {
  return {
    name: process.env.APP_NAME ?? defaultAppConfig.name,
    version: process.env.APP_VERSION ?? defaultAppConfig.version,
    logoUrl: process.env.APP_LOGO_URL ?? defaultAppConfig.logoUrl,
  };
}

export const authConfig = getAuthConfig();
export const uiConfig = getUiConfig();
export const appConfig = getAppConfig();

export const config = {
  auth: authConfig,
  ui: uiConfig,
  app: appConfig,
};

export default config;
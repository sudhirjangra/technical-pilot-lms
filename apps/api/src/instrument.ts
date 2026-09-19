import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    'https://a564f9dd34ee9733b4b6aeedf6c19e0d@o4512113462870016.ingest.de.sentry.io/4512113473093712',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : 1.0,
  integrations: [
    Sentry.pinoIntegration({
      log: { levels: ['info', 'warn', 'error'] },
      error: { levels: ['error'] },
    }),
  ],
  dataCollection: {
    // userInfo: false,
    // httpBodies: [],
  },
});


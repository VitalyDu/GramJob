import type { Core } from '@strapi/strapi'

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'localhost:9000',
            '*.gramjob.com',
            'market-assets.strapi.io',
          ],
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: ['Authorization', 'Content-Type', 'X-Telegram-Init-Data'],
      origin: [process.env.FRONTEND_URL ?? 'http://localhost:3000', 'https://web.telegram.org'],
    },
  },
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::telegram-auth',
]

export default config

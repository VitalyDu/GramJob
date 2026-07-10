import type { Core } from '@strapi/strapi'

export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  const s3PublicHostname = env('S3_PUBLIC_HOSTNAME', '')

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    '*.gramjob.com',
    'market-assets.strapi.io',
    ...(s3PublicHostname ? [s3PublicHostname] : []),
  ]

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'img-src': imgSrc,
            'media-src': imgSrc,
          },
        },
      },
    },
    {
      name: 'strapi::cors',
      config: {
        headers: ['Authorization', 'Content-Type', 'X-Telegram-Init-Data'],
        origin: [
          ...env('FRONTEND_URL', 'http://localhost:3000')
            .split(',')
            .map((u: string) => u.trim()),
          'https://web.telegram.org',
        ],
      },
    },
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
    'global::auth-rate-limit',
    'global::api-rate-limit',
    'global::telegram-auth',
  ]
}

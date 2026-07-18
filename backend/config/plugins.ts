// backend/config/plugins.ts
import type { Core } from '@strapi/strapi'

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  'users-permissions': {
    config: {
      register: {
        allowedFields: ['firstName', 'lastName'],
      },
    },
  },
  email: {
    config: {
      provider: '@strapi/provider-email-nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'localhost'),
        port: env.int('SMTP_PORT', 1025),
        secure: env.bool('SMTP_SECURE', false),
        ...(env('SMTP_USER') ? { auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') } } : {}),
      },
      settings: {
        defaultFrom: env('EMAIL_FROM', 'noreply@gramjob.com'),
        defaultReplyTo: env('EMAIL_FROM', 'noreply@gramjob.com'),
      },
    },
  },
  upload: {
    config: {
      provider: '@strapi/provider-upload-aws-s3',
      // 5 MB per file. Аватар/лого — небольшие изображения, свыше — abuse S3/R2.
      sizeLimit: env.int('UPLOAD_SIZE_LIMIT_BYTES', 5 * 1024 * 1024),
      // Native mime-validation Strapi 5 (детектит содержимое + сверяет со списком).
      // Продукту не нужны non-image uploads — расширять только осознанно.
      security: {
        allowedTypes: ['image/*'],
      },
      providerOptions: {
        baseUrl: env('S3_PUBLIC_URL', ''),
        s3Options: {
          credentials: {
            accessKeyId: env('S3_ACCESS_KEY_ID'),
            secretAccessKey: env('S3_SECRET_ACCESS_KEY'),
          },
          region: env('S3_REGION', 'us-east-1'),
          endpoint: env('S3_ENDPOINT'),
          forcePathStyle: env.bool('S3_FORCE_PATH_STYLE', false),
          params: {
            Bucket: env('S3_BUCKET', 'gramjob'),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
})

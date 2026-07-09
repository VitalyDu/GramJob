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
  upload: {
    config: {
      provider: '@strapi/provider-upload-aws-s3',
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

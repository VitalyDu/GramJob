// backend/config/plugins.ts
import type { Core } from '@strapi/strapi'

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  upload: {
    config: {
      provider: '@strapi/provider-upload-aws-s3',
      providerOptions: {
        accessKeyId: env('S3_ACCESS_KEY_ID'),
        secretAccessKey: env('S3_SECRET_ACCESS_KEY'),
        region: env('S3_REGION', 'us-east-1'),
        params: {
          Bucket: env('S3_BUCKET', 'gramjob'),
        },
        endpoint: env('S3_ENDPOINT'),
        forcePathStyle: env.bool('S3_FORCE_PATH_STYLE', false),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
})

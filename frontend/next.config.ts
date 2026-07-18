import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Content Security Policy:
//   frame-ancestors — разрешаем embed в Telegram Web (web.telegram.org, k.telegram.org)
//     и запрещаем произвольные сайты (замена X-Frame-Options).
//   script-src — 'unsafe-inline'/'unsafe-eval' нужны для Next.js hydration и
//     turbopack HMR в dev; telegram.org для telegram-web-app.js SDK.
//   img-src — data:/blob: для превью, https:/http: чтобы покрыть MinIO (localhost:9000),
//     Strapi uploads и R2. При переходе на R2 c публичным доменом можно сузить.
//   connect-src — api.gramjob.com + localhost:1337 в dev + Sentry ingest.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data:",
  "connect-src 'self' https: http:",
  "frame-src 'self' https://telegram.org",
  "frame-ancestors 'self' https://web.telegram.org https://k.telegram.org",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: cspDirectives },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Apply to all routes except well-known paths that embed the Mini App
        source: '/((?!_next|favicon|logo).*)',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.gramjob.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
        pathname: '/**',
      },
    ],
  },
}

/* eslint-disable @typescript-eslint/no-require-imports */
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? (require('@next/bundle-analyzer') as (o: object) => (c: NextConfig) => NextConfig)({
        enabled: true,
      })
    : (c: NextConfig) => c
/* eslint-enable @typescript-eslint/no-require-imports */

const configured = withBundleAnalyzer(nextConfig)

// Sentry wraps the config even without env vars — it only uploads sourcemaps
// when SENTRY_AUTH_TOKEN is set, so local/CI builds without secrets are safe.
const sentryOptions = {
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
}

export default withSentryConfig(configured, sentryOptions)

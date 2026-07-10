import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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

export default withBundleAnalyzer(nextConfig)

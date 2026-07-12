import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testTimeout: 120000,
  // Suites share one PostgreSQL test database — parallel workers race on schema/data
  maxWorkers: 1,
  // Strapi's internal event hub can fire a DB query right at shutdown (race after
  // the last HTTP write) — the pending Knex acquisition keeps Node alive and its
  // unhandled rejection crashes the process with exit 1 despite all tests passing
  forceExit: true,
}

export default config

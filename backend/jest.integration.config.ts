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
}

export default config

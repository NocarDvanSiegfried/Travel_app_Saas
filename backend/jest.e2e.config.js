/**
 * Jest Configuration for E2E Tests
 * 
 * Separate configuration for end-to-end tests with real databases.
 * E2E tests verify complete user scenarios across the entire stack.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/e2e/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts',
    '!src/**/*.config.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup.ts'],
  testTimeout: 30000, // 30 seconds for E2E tests
  verbose: true,
  maxWorkers: 1, // Run E2E tests sequentially to avoid DB conflicts
};











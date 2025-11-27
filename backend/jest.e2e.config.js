/**
 * Jest Configuration for E2E Tests
 * 
 * Конфигурация для end-to-end тестов.
 * Использует реальное окружение (Docker Compose).
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  roots: ['<rootDir>/src'],
  
  testMatch: [
    '**/__tests__/e2e/**/*.test.ts',
    '**/__tests__/e2e/**/*.spec.ts',
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/unit/',
    '/__tests__/integration/',
  ],
  
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
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/e2e/setup.ts'],
  
  // Увеличенный таймаут для E2E тестов (60 секунд)
  testTimeout: 60000,
  
  verbose: true,
  
  // Запуск тестов последовательно
  maxWorkers: 1,
  
  clearMocks: false,
  restoreMocks: false,
};

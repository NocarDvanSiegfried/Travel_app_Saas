/**
 * Jest Configuration for Integration Tests
 * 
 * Конфигурация для integration тестов с реальными зависимостями.
 * Использует тестовую базу данных и Redis.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  roots: ['<rootDir>/src'],
  
  testMatch: [
    '**/__tests__/integration/**/*.test.ts',
    '**/__tests__/integration/**/*.spec.ts',
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/unit/',
    '/__tests__/e2e/',
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
  
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup.ts'],
  
  // Увеличенный таймаут для integration тестов (30 секунд)
  testTimeout: 30000,
  
  verbose: true,
  
  // Запуск тестов последовательно для избежания конфликтов БД
  maxWorkers: 1,
  
  // Не очищать моки автоматически (для проверки реальных вызовов)
  clearMocks: false,
  restoreMocks: false,
};

/**
 * Jest Configuration for Unit Tests
 * 
 * Полная конфигурация Jest для unit тестов SMART MULTIMODAL ROUTING SYSTEM.
 * Изолированное окружение с моками всех внешних зависимостей.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Корни для поиска тестов
  roots: ['<rootDir>/src'],
  
  // Паттерны для поиска тестов
  testMatch: [
    '**/__tests__/unit/**/*.test.ts',
    '**/__tests__/unit/**/*.spec.ts',
  ],
  
  // Игнорируемые пути
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/integration/',
    '/__tests__/e2e/',
  ],
  
  // Расширения файлов
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Файлы для сбора покрытия
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts',
    '!src/**/*.config.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/types/**',
  ],
  
  // Директория для отчётов покрытия
  coverageDirectory: 'coverage/unit',
  
  // Репортёры покрытия
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Пороги покрытия кода
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Критические модули SMART ROUTING - 100% coverage
    './src/application/smart-routing/algorithms/SmartRouteBuilder.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/application/smart-routing/algorithms/PriceCalculator.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/application/smart-routing/algorithms/HubSelector.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // Важные модули SMART ROUTING - 90%+ coverage
    './src/application/smart-routing/algorithms/DistanceCalculator.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/application/smart-routing/algorithms/RealisticPathCalculator.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/application/smart-routing/algorithms/TrainStationGraph.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Вспомогательные модули SMART ROUTING - 80%+ coverage
    './src/application/smart-routing/algorithms/ConnectivityGuarantor.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/application/smart-routing/validation/RealityChecker.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/application/smart-routing/validation/RouteErrorDetector.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/domain/smart-routing/data/connections-validator.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Инфраструктура - 70%+ coverage
    './src/infrastructure/api/osrm/OsrmClient.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Маппинг модулей
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Файлы для выполнения перед тестами
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  
  // Таймаут для тестов (10 секунд для unit тестов)
  testTimeout: 10000,
  
  // Детальный вывод
  verbose: true,
  
  // Очистка моков после каждого теста
  clearMocks: true,
  
  // Восстановление моков после каждого теста
  restoreMocks: true,
  
  // Изоляция модулей
  resetModules: false,
  
  // Максимальное количество воркеров
  maxWorkers: '50%',
};

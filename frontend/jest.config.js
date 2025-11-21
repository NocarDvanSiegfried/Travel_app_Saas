const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Путь к Next.js приложению для загрузки next.config.js и .env файлов
  dir: './',
})

// Добавляем кастомную конфигурацию Jest
const customJestConfig = {
  // Окружение для тестов (jsdom для DOM API)
  testEnvironment: 'jest-environment-jsdom',
  
  // Файлы, которые будут выполняться перед каждым тестом
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Паттерны для поиска тестовых файлов
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Исключаем из тестирования
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/e2e/',
  ],
  
  // Маппинг модулей для алиасов TypeScript
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Настройки для сбора покрытия
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  
  // Пороги покрытия (опционально, можно настроить позже)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  
  // Расширения модулей
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}

// Создаем и экспортируем конфигурацию
module.exports = createJestConfig(customJestConfig)


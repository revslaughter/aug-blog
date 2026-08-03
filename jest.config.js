const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Playwright owns tests/visual — those specs import @playwright/test and
  // would fail under jest.
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/visual/',
    '<rootDir>/out/',
  ],
})

const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

const baseConfig = createJestConfig({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Playwright owns tests/visual — those specs import @playwright/test, which
  // throws if Jest loads it. Jest and Playwright both collect *.spec/*.test
  // files, so the split has to be explicit.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/tests/visual/'],
})

/**
 * next/jest prepends its own `/node_modules/` entry to transformIgnorePatterns,
 * so anything appended through the object above is ignored — the first match
 * wins and node_modules stays untransformed. The remark/unified toolchain ships
 * ESM only, so a test importing it fails with "Cannot use import statement
 * outside a module" until node_modules goes through the transform.
 *
 * Overriding after next/jest has resolved its config is the only way to replace
 * that entry rather than add to it. Transforming all of node_modules rather
 * than allowlisting the ~40 packages in remark's dependency tree, which would
 * need revisiting every time that tree shifts; SWC makes it cheap and the
 * result is cached.
 */
module.exports = async (...args) => {
  const config = await baseConfig(...args)
  return {
    ...config,
    transformIgnorePatterns: ['^.+\\.module\\.(css|sass|scss)$'],
  }
}

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  // ESM support
  extensionsToTreatAsEsm: ['.js', '.mjs'],
  testMatch: ['**/*.test.js']
};

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  transform: {},                 // no Babel, plain JS
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/*.test.js']
};

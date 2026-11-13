export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/tests/**'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 60000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
};

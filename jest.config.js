module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/fetchMock.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts'
  ],
  verbose: true
};
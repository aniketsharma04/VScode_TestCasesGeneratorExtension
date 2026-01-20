module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/out/',
    '/AppData/',
    '/Program Files/'
  ],
  maxWorkers: 1
};

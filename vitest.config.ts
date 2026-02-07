import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    // Run test files sequentially since they share a DB
    sequence: { concurrent: false },
    fileParallelism: false,
    // Unit tests don't need DB setup
    exclude: ['**/node_modules/**'],
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'api',
          globals: true,
          include: ['tests/api/**/*.test.ts'],
          globalSetup: ['./tests/globalSetup.ts'],
          setupFiles: ['./tests/setup.ts'],
          testTimeout: 15000,
          hookTimeout: 30000,
          sequence: { concurrent: false },
          fileParallelism: false,
        },
      },
    ],
  },
});

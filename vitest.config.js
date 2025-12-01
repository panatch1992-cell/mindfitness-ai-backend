import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'public/**',
        'vitest.config.js',
      ],
      thresholds: {
        // Critical safety code should have 100% coverage
        'utils/crisis.js': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
    include: ['tests/**/*.test.js'],
  },
});

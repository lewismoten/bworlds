import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/**/src/**/*.js'],
    },
  },
});

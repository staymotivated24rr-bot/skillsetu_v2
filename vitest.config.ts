import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://postgres:postgres@127.0.0.1:5432/skillsetu_test?schema=public',
    },
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});

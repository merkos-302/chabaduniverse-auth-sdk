import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // MerkosProvider.test.tsx excluded due to vi.mock causing infinite hang during collection
    // TODO: Fix mock pattern - see https://github.com/vitest-dev/vitest/issues/1153
    exclude: ['**/MerkosProvider.test.tsx', 'node_modules', 'dist'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        '**/test/**',
        '**/__tests__/**',
      ],
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});

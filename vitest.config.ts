import {defineConfig} from 'vitest/config';
import {preactAliases} from './vite.config.ts';

export default defineConfig({
  resolve: {alias: preactAliases},
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    // Runs after the build (npm run test:budget), not with the unit tests.
    exclude: ['tests/unit/bundle-budget.test.ts'],
    // Inline React-based deps so their `react` imports go through the preact aliases too.
    server: {deps: {inline: [/motion/, /framer-motion/, /@testing-library\/react/]}},
  },
});

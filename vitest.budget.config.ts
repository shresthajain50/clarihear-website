import {defineConfig} from 'vitest/config';

// Run after `npm run build`: checks the built JS against the size budget.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/bundle-budget.test.ts'],
  },
});

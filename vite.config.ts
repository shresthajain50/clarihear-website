import {defineConfig} from 'vite';

/**
 * React Bits components are written against React; they run on preact/compat, which is about
 * 55 KB gzip smaller than React 19. vitest.config.ts reuses this so tests run on the same thing.
 */
export const preactAliases = [
  {find: /^react-dom\/test-utils$/, replacement: 'preact/test-utils'},
  {find: /^react-dom\/client$/, replacement: 'preact/compat/client'},
  {find: /^react-dom$/, replacement: 'preact/compat'},
  {find: /^react\/jsx-(dev-)?runtime$/, replacement: 'preact/jsx-runtime'},
  {find: /^react$/, replacement: 'preact/compat'},
];

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  resolve: {alias: preactAliases},
  build: {
    rollupOptions: {
      input: {main: 'index.html', privacy: 'privacy.html', credits: 'credits.html'},
      // motion ships "use client" directives; they are meaningless in this static build.
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});

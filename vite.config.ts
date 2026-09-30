import {defineConfig} from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    rollupOptions: {
      input: {main: 'index.html', privacy: 'privacy.html'},
    },
  },
});

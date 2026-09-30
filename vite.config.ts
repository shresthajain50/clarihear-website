import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {main: 'index.html', privacy: 'privacy.html', credits: 'credits.html'},
    },
  },
});

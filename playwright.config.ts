import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {baseURL: 'http://localhost:4173'},
  webServer: [
    {
      // Sign-ups open: built with a fake key; the Web3Forms endpoint is stubbed per test.
      command: 'npm run build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {VITE_WEB3FORMS_KEY: 'test-key'},
    },
    {
      // Launch state until the owner adds a key: built with an EMPTY key into its own outDir.
      command:
        'npx vite build --outDir dist-nokey --emptyOutDir && npx vite preview --outDir dist-nokey --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {VITE_WEB3FORMS_KEY: ''},
    },
  ],
  projects: [
    {name: 'chromium-desktop', use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 800}}},
    {
      name: 'chromium-mobile',
      use: {...devices['Desktop Chrome'], viewport: {width: 375, height: 812}, isMobile: true, hasTouch: true},
    },
  ],
});

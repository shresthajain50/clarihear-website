import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {baseURL: 'http://localhost:4173'},
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {VITE_WEB3FORMS_KEY: 'test-key'},
  },
  projects: [
    {name: 'chromium-desktop', use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 800}}},
    {
      name: 'chromium-mobile',
      use: {...devices['Desktop Chrome'], viewport: {width: 375, height: 812}, isMobile: true, hasTouch: true},
    },
  ],
});

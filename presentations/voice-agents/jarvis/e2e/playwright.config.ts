import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  use: {
    // Accept self-signed mkcert certs
    ignoreHTTPSErrors: true,
  },
});

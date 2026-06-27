import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:3000/presentations/voice-agents/01-title';

test.use({
  // Chromium flag to provide a fake audio device for getUserMedia
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
});

test('Activate Jarvis button connects and shows idle status', async ({ page, context }) => {
  await context.grantPermissions(['microphone']);
  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  // Find and click the "Activate Jarvis" button in the sidebar
  const activateButton = page.getByRole('button', { name: /Activate Jarvis/i });
  await expect(activateButton).toBeVisible({ timeout: 10_000 });
  await activateButton.click();

  // After clicking, the button should change to "Disconnect"
  const disconnectButton = page.getByRole('button', { name: /Disconnect/i });
  await expect(disconnectButton).toBeVisible({ timeout: 15_000 });

  // Clean up: disconnect
  await disconnectButton.click();
  await expect(activateButton).toBeVisible({ timeout: 5_000 });
});

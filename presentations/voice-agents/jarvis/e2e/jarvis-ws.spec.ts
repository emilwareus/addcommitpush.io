import { test, expect } from '@playwright/test';

// Use ws:// for dev (JARVIS_NO_SSL=1), wss:// for production
const WS_URL = process.env.JARVIS_NO_SSL ? 'ws://localhost:8765/ws' : 'wss://localhost:8765/ws';

test('WebSocket connects to Jarvis and receives ready message', async ({ page }) => {
  await page.goto('about:blank');

  const result = await page.evaluate(async (url: string) => {
    return new Promise<{ connected: boolean; readyReceived: boolean; error?: string }>(
      (resolve) => {
        const ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';

        const timeout = setTimeout(() => {
          ws.close();
          resolve({ connected: false, readyReceived: false, error: 'timeout after 10s' });
        }, 10_000);

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'ready') {
                clearTimeout(timeout);
                ws.close();
                resolve({ connected: true, readyReceived: true });
              }
            } catch {
              // ignore non-JSON
            }
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({
            connected: false,
            readyReceived: false,
            error: 'WebSocket error (likely SSL or connection refused)',
          });
        };

        ws.onclose = (e) => {
          clearTimeout(timeout);
          resolve({
            connected: false,
            readyReceived: false,
            error: `WebSocket closed: code=${e.code} reason=${e.reason}`,
          });
        };
      },
    );
  }, WS_URL);

  console.log('WebSocket test result:', JSON.stringify(result, null, 2));
  expect(result.connected, `Connection failed: ${result.error}`).toBe(true);
  expect(result.readyReceived, 'Did not receive ready message').toBe(true);
});

test('WebSocket accepts slide_context message', async ({ page }) => {
  await page.goto('about:blank');

  const result = await page.evaluate(async (url: string) => {
    return new Promise<{ readyReceived: boolean; contextSent: boolean; error?: string }>(
      (resolve) => {
        const ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';

        const timeout = setTimeout(() => {
          ws.close();
          resolve({ readyReceived: false, contextSent: false, error: 'timeout after 10s' });
        }, 10_000);

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            const msg = JSON.parse(event.data);
            if (msg.type === 'ready') {
              ws.send(
                JSON.stringify({
                  type: 'slide_context',
                  context: {
                    current_title: 'Test Slide',
                    current_notes: 'Test notes',
                    next_title: 'Next Slide',
                    remaining: 5,
                  },
                }),
              );
              clearTimeout(timeout);
              ws.close();
              resolve({ readyReceived: true, contextSent: true });
            }
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve({ readyReceived: false, contextSent: false, error: 'WebSocket error' });
        };

        ws.onclose = (e) => {
          clearTimeout(timeout);
          resolve({
            readyReceived: false,
            contextSent: false,
            error: `WebSocket closed: code=${e.code}`,
          });
        };
      },
    );
  }, WS_URL);

  expect(result.readyReceived, `Failed: ${result.error}`).toBe(true);
  expect(result.contextSent).toBe(true);
});

test('WebSocket accepts binary audio frames without crashing', async ({ page }) => {
  await page.goto('about:blank');

  const result = await page.evaluate(async (url: string) => {
    return new Promise<{ audioSent: boolean; frameCount: number; error?: string }>((resolve) => {
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      let resolved = false;
      let framesSent = 0;

      const done = (r: { audioSent: boolean; frameCount: number; error?: string }) => {
        if (resolved) return;
        resolved = true;
        resolve(r);
      };

      const timeout = setTimeout(() => {
        ws.close();
        done({ audioSent: false, frameCount: framesSent, error: 'timeout after 10s' });
      }, 10_000);

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ready') {
            // Send multiple binary frames: 4-byte header + 512 int16 samples (32ms at 16kHz)
            const headerSize = 4;
            const samples = 512; // CHUNK_SAMPLES (Silero v5 requires exactly 512 at 16kHz)

            for (let i = 0; i < 5; i++) {
              const frame = new ArrayBuffer(headerSize + samples * 2);
              const view = new DataView(frame);
              view.setUint32(0, 0, true); // flags = 0 (tts not playing)
              ws.send(frame);
              framesSent++;
            }

            // Wait 1s — if connection stays open, the server handled frames fine
            setTimeout(() => {
              clearTimeout(timeout);
              ws.close();
              done({ audioSent: true, frameCount: framesSent });
            }, 1000);
          }
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        done({ audioSent: false, frameCount: framesSent, error: 'WebSocket error' });
      };

      ws.onclose = (e) => {
        // Only treat as failure if we haven't finished our send+wait cycle
        if (!resolved) {
          clearTimeout(timeout);
          done({
            audioSent: false,
            frameCount: framesSent,
            error: `WebSocket closed unexpectedly: code=${e.code}`,
          });
        }
      };
    });
  }, WS_URL);

  console.log('Audio test result:', JSON.stringify(result, null, 2));
  expect(result.audioSent, `Failed: ${result.error}`).toBe(true);
  expect(result.frameCount).toBeGreaterThan(0);
});

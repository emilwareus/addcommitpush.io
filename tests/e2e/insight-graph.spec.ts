import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { getAllPublishedBrainNotes, getBrainGraphEdges } from '../../lib/brain/read-vault';

const notes = getAllPublishedBrainNotes();
const expectedPairs = [
  ...new Set(
    getBrainGraphEdges()
      .filter((edge) => edge.sourceSlug !== edge.targetSlug)
      .map((edge) => [edge.sourceSlug, edge.targetSlug].sort().join('|'))
  ),
].sort();

// Every scenario must finish without an uncaught browser error.
const test = base.extend({
  page: async ({ page }, runTest) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await runTest(page);
    expect(errors, 'Uncaught browser errors').toEqual([]);
  },
});

function graph(page: Page) {
  return page.getByRole('group', { name: 'Connected insight graph', exact: true });
}

function camera(page: Page) {
  return graph(page).locator(':scope > g');
}

async function startDrag(page: Page) {
  const canvas = graph(page);
  await canvas.scrollIntoViewIfNeeded();
  await canvas.evaluate((element) => {
    element.addEventListener(
      'pointerdown',
      (event) => {
        const pointer = event as PointerEvent;
        element.setAttribute('data-test-pointer-id', String(pointer.pointerId));
      },
      { once: true }
    );
  });
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + 16, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute('data-test-pointer-id', /^\d+$/);
  return { x: bounds.x + 16, y: bounds.y + bounds.height / 2 };
}

async function moveAndEndInSameTask(canvas: Locator, ending: string, x: number, y: number) {
  await canvas.evaluate(
    (element, args) => {
      const pointerId = Number(element.getAttribute('data-test-pointer-id'));
      // Queue several React updates before release/cancel clears the drag ref.
      for (let step = 1; step <= 8; step++) {
        element.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerId,
            pointerType: 'mouse',
            buttons: 1,
            clientX: args.x + step * 7,
            clientY: args.y + step * 3,
          })
        );
      }
      element.dispatchEvent(
        new PointerEvent(args.ending, {
          bubbles: true,
          pointerId,
          pointerType: 'mouse',
          buttons: 0,
        })
      );
    },
    { ending, x, y }
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/brain');
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(graph(page)).toBeVisible();
});

for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  test(`rapid drag updates survive ${ending}`, async ({ page }) => {
    const start = await startDrag(page);
    const initial = await camera(page).getAttribute('transform');
    await moveAndEndInSameTask(graph(page), ending, start.x, start.y);
    await expect(camera(page)).not.toHaveAttribute('transform', initial!);
    const ended = await camera(page).getAttribute('transform');
    await graph(page).evaluate((element) => {
      element.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: Number(element.getAttribute('data-test-pointer-id')),
          clientX: 800,
          clientY: 500,
          buttons: 0,
        })
      );
    });
    await page.mouse.up();
    await expect(camera(page)).toHaveAttribute('transform', ended!);
    await page.getByRole('button', { name: 'Fit graph', exact: true }).click();
    await expect(camera(page)).toHaveAttribute('transform', 'translate(0 0) scale(1)');
    // A new gesture still works after the previous gesture ends.
    const next = await startDrag(page);
    await page.mouse.move(next.x + 40, next.y + 20, { steps: 5 });
    await page.mouse.up();
    await expect(camera(page)).not.toHaveAttribute('transform', 'translate(0 0) scale(1)');
  });
}

test('another pointer cannot move or end an active drag', async ({ page }) => {
  const start = await startDrag(page);
  const before = await camera(page).getAttribute('transform');
  await graph(page).evaluate((element) => {
    const pointerId = Number(element.getAttribute('data-test-pointer-id')) + 100;
    for (const type of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId,
          pointerType: 'touch',
          clientX: 700,
          clientY: 500,
        })
      );
    }
  });
  await expect(camera(page)).toHaveAttribute('transform', before!);
  await page.mouse.move(start.x + 50, start.y + 30, { steps: 3 });
  await page.mouse.up();
  await expect(camera(page)).not.toHaveAttribute('transform', before!);
});

test('keeps every note and cross-topic link in one graph', async ({ page }) => {
  await expect(graph(page)).toHaveCount(1);
  await expect(graph(page).locator('[data-note]')).toHaveCount(notes.length);
  const pairs = await graph(page)
    .locator('path[data-source]')
    .evaluateAll((paths) =>
      paths
        .map((path) =>
          [path.getAttribute('data-source'), path.getAttribute('data-target')].sort().join('|')
        )
        .sort()
    );
  expect(pairs).toEqual(expectedPairs);
  // Stop idle motion before Playwright checks whether the SVG label is stable.
  await page.getByRole('button', { name: 'Pause graph motion' }).click();
  const highlight = page.getByRole('button', { name: 'Highlight Static analysis', exact: true });
  await highlight.click();
  await expect(highlight).toHaveAttribute('aria-pressed', 'true');
  await expect(graph(page).locator('[data-note]')).toHaveCount(notes.length);
  await expect(graph(page).locator('path[data-active=true]').first()).toBeVisible();
  await page.getByRole('button', { name: 'All topics', exact: true }).click();
  await expect(highlight).toHaveAttribute('aria-pressed', 'false');
});

test('zooms within limits, pans, and fits the whole graph', async ({ page }) => {
  const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
  const zoomOut = page.getByRole('button', { name: 'Zoom out', exact: true });
  await expect(zoomOut).toBeDisabled();
  for (let index = 0; index < 4; index++) await zoomIn.click();
  await expect(zoomIn).toBeDisabled();
  await expect(camera(page)).toHaveAttribute('transform', /scale\(3\)/);
  const start = await startDrag(page);
  const before = await camera(page).getAttribute('transform');
  await page.mouse.move(start.x + 60, start.y + 50, { steps: 8 });
  await page.mouse.up();
  await expect(camera(page)).not.toHaveAttribute('transform', before!);
  await page.getByRole('button', { name: 'Fit graph', exact: true }).click();
  await expect(camera(page)).toHaveAttribute('transform', 'translate(0 0) scale(1)');
  await expect(zoomOut).toBeDisabled();
});

test('selects notes by keyboard, follows connections, and opens a note', async ({
  page,
  isMobile,
}) => {
  const note = graph(page).locator('[data-note="polint"]');
  await note.focus();
  await note.press('Enter');
  const details = page.getByRole('complementary', { name: 'Note details' });
  await expect(details).toHaveAttribute('data-selected', 'true');
  const title = await details.getByRole('heading').textContent();
  if (!isMobile) {
    await graph(page).locator('[data-note="voice-agents"]').hover();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await expect(details.getByRole('heading')).toHaveText(title!);
  }
  if (isMobile) {
    const bounds = (await details.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await details.getByRole('button').nth(1).click();
  await expect(details.getByRole('heading')).not.toHaveText(title!);
  const nextTitle = await details.getByRole('heading').textContent();
  const href = await details.getByRole('link', { name: 'Read note' }).getAttribute('href');
  await details.getByRole('link', { name: 'Read note' }).click();
  await expect(page).toHaveURL(href!);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(nextTitle!);
});

test('clears selection with Escape and resets the graph when filters change', async ({ page }) => {
  await graph(page).locator('[data-note="polint"]').focus();
  await page.keyboard.press('Space');
  const details = page.getByRole('complementary', { name: 'Note details' });
  await expect(details).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(details).toHaveAttribute('data-selected', 'false');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'post-seed', exact: true }).click();
  await expect(graph(page).locator('[data-note]')).toHaveCount(
    notes.filter((note) => note.type === 'post-seed').length
  );
  await expect(camera(page)).toHaveAttribute('transform', 'translate(0 0) scale(1)');
  await page.getByRole('button', { name: 'all types', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search brain notes' }).fill('no-matching-note-984739');
  await expect(graph(page)).toHaveCount(0);
  await expect(
    page.getByText('No notes match these filters. Clear a filter to see the map.')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(graph(page).locator('[data-note]')).toHaveCount(notes.length);
});

test('pauses motion and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const motion = camera(page).locator(':scope > g');
  await page.getByRole('button', { name: 'Pause graph motion' }).click();
  await expect(motion).toHaveCSS('animation-play-state', 'paused');
  await page.getByRole('button', { name: 'Resume graph motion' }).click();
  await page.mouse.move(0, 0);
  await expect(motion).toHaveCSS('animation-play-state', 'running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(motion).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: 'Pause graph motion' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a click or tap selects a note without starting a drag', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: 'Pause graph motion' }).click();
  const note = graph(page).locator('[data-note="polint"]');
  const before = await camera(page).getAttribute('transform');
  if (isMobile) await note.tap();
  else await note.click();
  await expect(note).toHaveAttribute('aria-pressed', 'true');
  await expect(camera(page)).toHaveAttribute('transform', before!);
  await expect(page.getByRole('link', { name: 'Read note' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear selected note' }).click();
  await expect(note).toHaveAttribute('aria-pressed', 'false');
});

test('releasing the pointer outside the graph ends the drag', async ({ page }) => {
  const start = await startDrag(page);
  const bounds = (await graph(page).boundingBox())!;
  const outsideX = Math.min(page.viewportSize()!.width - 2, bounds.x + bounds.width + 20);
  await page.mouse.move(outsideX, start.y, { steps: 10 });
  await page.mouse.up();
  const ended = await camera(page).getAttribute('transform');
  await page.mouse.move(start.x + 40, start.y + 30);
  await expect(camera(page)).toHaveAttribute('transform', ended!);
  await page.getByRole('button', { name: 'Fit graph' }).click();
  await expect(camera(page)).toHaveAttribute('transform', 'translate(0 0) scale(1)');
});

test('each node shows its full name beside the node on hover or focus', async ({
  page,
  isMobile,
}) => {
  await page.getByRole('button', { name: 'Pause graph motion' }).click();
  const tooltip = page.getByRole('tooltip');
  for (const note of notes) {
    const node = graph(page).locator(`[data-note="${note.slug}"]`);
    if (isMobile) await node.focus();
    else await node.hover();
    await expect(tooltip).toHaveText(note.title);
    await expect(tooltip).toBeVisible();
    await expect(node).toHaveAttribute('aria-describedby', (await tooltip.getAttribute('id'))!);
    const nodeBounds = (await node.boundingBox())!;
    const labelBounds = (await tooltip.boundingBox())!;
    const canvas = (await graph(page).boundingBox())!;
    expect(labelBounds.x).toBeGreaterThanOrEqual(canvas.x);
    expect(labelBounds.x + labelBounds.width).toBeLessThanOrEqual(canvas.x + canvas.width);
    expect(labelBounds.y).toBeGreaterThanOrEqual(canvas.y);
    expect(labelBounds.y + labelBounds.height).toBeLessThanOrEqual(canvas.y + canvas.height);
    const centerX = nodeBounds.x + nodeBounds.width / 2;
    const centerY = nodeBounds.y + nodeBounds.height / 2;
    const distanceX = Math.max(
      labelBounds.x - centerX,
      centerX - labelBounds.x - labelBounds.width,
      0
    );
    const distanceY = Math.max(
      labelBounds.y - centerY,
      centerY - labelBounds.y - labelBounds.height,
      0
    );
    expect(distanceX).toBeLessThan(25);
    expect(distanceY).toBeLessThan(25);
  }
  await page.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
});

test('node names follow the zoomed position and clear on pointer exit', async ({ page }) => {
  await page.getByRole('button', { name: 'Pause graph motion' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const node = graph(page).locator('[data-note="write-code-ai-agents-love"]');
  await node.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toHaveText(
    notes.find((note) => note.slug === 'write-code-ai-agents-love')!.title
  );
  const nodeBounds = (await node.boundingBox())!;
  const labelBounds = (await tooltip.boundingBox())!;
  expect(Math.abs(labelBounds.y - nodeBounds.y)).toBeLessThan(150);
  await page.getByRole('button', { name: 'Fit graph' }).hover();
  await expect(tooltip).toHaveCount(0);
});

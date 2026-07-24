import { defineTour } from 'demohunter';

const DEMO_PASSWORD = process.env.LIFE_DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  throw new Error('LIFE_DEMO_PASSWORD is required to record the Life demo.');
}
const FEATURE_MEMORY_ID = '10000000-0000-4000-8000-000000000001';
const CONVERSATION_ID = '20000000-0000-4000-8000-000000000001';

export default defineTour({
  id: 'life-simplified',
  title: 'Life: talk, remember, explore',

  async beforeRecord({ goto, page }) {
    await page.context().clearCookies();
    await goto('/life/login');
    await page.getByRole('heading', { name: 'Life' }).waitFor();
  },

  async run({ page, goto, chapter, step, highlight, waitForStable }) {
    await chapter('Open Life', { id: 'login' });
    await step('Unlock the owner workspace', async () => {
      await highlight(page.getByRole('heading', { name: 'Life' }), { durationMs: 1200 });
      await page.getByLabel('Password').pressSequentially(DEMO_PASSWORD, { delay: 45 });
      await page.getByRole('button', { name: 'Unlock Life' }).click();
      await page.getByRole('heading', { name: 'Talk with Life' }).waitFor();
    });

    await chapter('Voice first', { id: 'voice' });
    await step('Show the primary experience', async () => {
      await waitForStable();
      await highlight(page.getByRole('button', { name: 'Start talking' }), {
        style: 'spotlight',
        durationMs: 1800,
      });
      await highlight(page.getByText(/records memories you share/), {
        durationMs: 1600,
      });
      await highlight(page.getByRole('heading', { name: 'Conversation' }), {
        durationMs: 1400,
      });
    });

    await chapter('Memories', { id: 'memories' });
    await step('Browse the durable memory collection', async () => {
      await goto('/life/memories');
      await page.getByRole('heading', { name: 'Memories', exact: true }).waitFor();
      await page
        .getByPlaceholder('Search Life memory')
        .pressSequentially('local-first tools', { delay: 55 });
      await highlight(page.getByRole('heading', { name: 'Building DemoHunter', exact: true }), {
        style: 'spotlight',
        durationMs: 1800,
      });
    });

    await step('Open one memory', async () => {
      await goto(`/life/memories/${FEATURE_MEMORY_ID}`);
      await page.getByRole('heading', { name: 'Building DemoHunter', exact: true }).waitFor();
      await highlight(page.getByText(/DemoHunter turns browser product tours/), {
        durationMs: 1600,
      });
      await highlight(page.getByRole('heading', { name: 'Append-only changes' }), {
        style: 'spotlight',
        durationMs: 1500,
      });
    });

    await chapter('Explore', { id: 'explore' });
    await step('See memories in time', async () => {
      await goto('/life/timeline');
      await page.getByRole('heading', { name: 'Timeline', exact: true }).waitFor();
      await highlight(page.getByRole('heading', { name: 'Timeline', exact: true }), {
        durationMs: 1200,
      });
      await highlight(page.getByText('Started building DemoHunter'), {
        style: 'spotlight',
        durationMs: 1800,
      });
    });

    await step('Inspect a saved conversation', async () => {
      await goto(`/life/conversations/${CONVERSATION_ID}`);
      await page.getByRole('heading', { name: 'What Life should remember' }).waitFor();
      await highlight(page.getByText(/You do your best focused work early/), {
        durationMs: 1700,
      });
      await highlight(page.getByText('Cited memories'), {
        style: 'spotlight',
        durationMs: 1500,
      });
    });

    await chapter('Ownership', { id: 'settings' });
    await step('Show profile and connectors', async () => {
      await goto('/life/settings');
      await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
      await highlight(page.getByLabel('Display name'), { durationMs: 1400 });
      await highlight(page.getByRole('link', { name: /Connectors/ }), {
        style: 'spotlight',
        durationMs: 1500,
      });
    });

    await step('Show portable data', async () => {
      await goto('/life/settings/data');
      await page.getByRole('heading', { name: 'Data export' }).waitFor();
      await highlight(page.getByRole('heading', { name: 'Export your data' }), {
        style: 'spotlight',
        durationMs: 1800,
      });
      await highlight(page.getByRole('link', { name: 'Download JSON' }), { durationMs: 1500 });
    });
  },
});

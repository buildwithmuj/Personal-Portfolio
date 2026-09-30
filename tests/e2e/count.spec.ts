import { expect, test, type Page } from '@playwright/test';
import { COUNT_URL } from '../../site.config.ts';
import { BASE_URL, SITE_ORIGIN } from '../support/site.ts';
import { stubWeather } from '../support/weather.ts';

// Visitor counts, by GoatCounter (src/lib/analytics.ts): one request per page view on the live
// site, no cookie, nothing kept in the browser. Until COUNT_URL is set (site.config.ts) the page
// carries no code for it, which the first test holds to.
const COUNTER = COUNT_URL ? new URL(COUNT_URL).origin : 'https://goatcounter.com';

/** Every request the page makes to the counter, answered here so none reaches it. */
async function countRequests(page: Page): Promise<URL[]> {
  const hits: URL[] = [];
  await page.route(`${COUNTER}/**`, (route) => {
    hits.push(new URL(route.request().url()));
    return route.fulfill({ status: 200, body: '' });
  });
  return hits;
}

test('nothing is counted away from the live site', async ({ page }) => {
  const hits = await countRequests(page);
  await stubWeather(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(hits).toEqual([]);
});

test.describe('on the live site', () => {
  test.skip(!COUNT_URL, 'Visitor counts are off until COUNT_URL is set in site.config.ts');

  test('a page view is counted once, with no cookie and nothing stored', async ({
    page,
    context,
  }) => {
    // The built site, served under its own address, which is where counting is switched on.
    await context.route(`${SITE_ORIGIN}/**`, async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace(SITE_ORIGIN, BASE_URL),
      });
      await route.fulfill({ response });
    });
    const hits = await countRequests(page);
    await stubWeather(page);
    await page.goto(`${SITE_ORIGIN}/privacy`);
    await page.waitForLoadState('networkidle');
    expect(hits).toHaveLength(1);
    const [hit] = hits;
    expect(`${hit?.origin}${hit?.pathname}`).toBe(COUNT_URL);
    expect(hit?.searchParams.get('p')).toBe('/privacy');
    expect(hit?.searchParams.get('t')).toBe(await page.title());
    expect(hit?.searchParams.get('s')).toMatch(/^\d+,\d+,[\d.]+$/);
    // Playwright drives the browser, so the view is marked for GoatCounter to set aside.
    expect(hit?.searchParams.get('b')).toBe('153');
    expect(await context.cookies()).toEqual([]);
    const stored = await page.evaluate(() => Object.keys(localStorage));
    expect(stored).toEqual([]);
  });
});

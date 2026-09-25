import { expect, test } from '@playwright/test';
import { EXPECTED_HEADERS } from '../support/headers.ts';
import { SERVER_ONLY, SITE_URL } from '../support/site.ts';

test('an unknown path returns the 404 page with a 404 status and every security header', async ({
  page,
}) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  const headers = response?.headers() ?? {};
  for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
    expect(headers[name], name).toBe(value);
  }
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('robots.txt allows crawling in production and names the sitemap', async ({
  request,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const text = await (await request.get('/robots.txt')).text();
  expect(text).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap-index.xml\n`);
});

test('the skip link comes first and moves focus to main', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not move focus to links with Tab by default');
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('Tab reaches every link and button on the home page', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not move focus to links with Tab by default');
  await page.goto('/');
  const count = await page.locator('a[href]:visible, button:visible').count();
  const reached = new Set<number>();
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    reached.add(
      await page.evaluate(() =>
        [...document.querySelectorAll('a[href], button')].indexOf(
          document.activeElement as Element,
        ),
      ),
    );
  }
  expect(reached.has(-1)).toBe(false);
  expect(reached.size).toBe(count);
});

import { expect, test } from '@playwright/test';
import { EXPECTED_HEADERS } from '../support/headers.ts';
import { SERVER_ONLY, SITE_ORIGIN } from '../support/site.ts';

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
  expect(text).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap-index.xml\n`);
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
  // Radios count once per group (the checked one); a collapsed section's controls are skipped.
  const focusable =
    'a[href]:visible, button:visible, summary:visible, input[type="radio"]:checked:visible';
  const count = await page.locator(focusable).count();
  const reached = new Set<number>();
  // Where focus went, when Tab lands on something that isn't a link, button or control.
  const strays: string[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    const { index, element } = await page.evaluate(() => {
      const active = document.activeElement as Element;
      const all = [...document.querySelectorAll('a[href], button, summary, input[type="radio"]')];
      return { index: all.indexOf(active), element: `${active.tagName} ${active.className}` };
    });
    reached.add(index);
    if (index === -1) strays.push(`Tab ${i + 1} of ${count}: ${element}`);
  }
  expect(strays).toEqual([]);
  expect(reached.size).toBe(count);
});

test('no source code leaks into the rendered page', async ({ page }) => {
  for (const path of ['/', '/projects', '/privacy', '/work/this-site']) {
    await page.goto(path);
    await expect(page.locator('body')).not.toContainText(/\bimport\s+\S+\s+from\s+['"]/);
  }
});

// A slow or hanging Open-Meteo must not keep the page busy: the browser gives up after 5 seconds and
// keeps the build-time reading. (CI's runners met exactly this, and every networkidle wait timed out.)
test('a hanging weather request is abandoned, and the page settles', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', () => {
    // Never answer.
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
});

// Open-Meteo's CC BY 4.0 licence asks for a credit wherever its weather data appears.
test('the footer credits Open-Meteo for the weather data', async ({ page }) => {
  for (const path of ['/', '/cv']) {
    await page.goto(path);
    const credit = page.locator('.site-footer').getByRole('link', { name: /Open-Meteo/ });
    await expect(credit).toHaveAttribute('href', 'https://open-meteo.com/');
  }
});

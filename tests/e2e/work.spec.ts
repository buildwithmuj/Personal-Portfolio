import { expect, test } from '@playwright/test';
import { builtPagePaths, SERVER_ONLY } from '../support/site.ts';

test('the home page links to each featured case study', async ({ page }) => {
  await page.goto('/');
  const work = page.getByRole('region', { name: 'Selected work' });
  await work.getByRole('link', { name: 'Sample Project' }).click();
  await expect(page).toHaveURL(/\/work\/sample-project$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sample Project' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Selected work' })).toBeVisible();
});

test('a case study shows its details and MDX components', async ({ page }) => {
  await page.goto('/work/sample-project');
  await expect(page.getByText('Design and front-end development')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Grey placeholder cover image' })).toBeVisible();
  await expect(page.locator('figure figcaption')).toHaveText('Placeholder detail image');
  await expect(page.getByRole('img', { name: 'Grey placeholder detail image' })).toBeVisible();
  await expect(page.locator('aside.callout')).toContainText('Placeholder callout');
  await expect(page.getByRole('link', { name: 'Live site' })).toHaveAttribute(
    'href',
    'https://example.com/',
  );
});

test('drafts are not published in production', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  expect(builtPagePaths()).toContain('/work/sample-project');
  expect(builtPagePaths()).not.toContain('/work/draft-example');
  expect((await request.get('/work/draft-example')).status()).toBe(404);
});

test('a trailing slash redirects to the canonical URL', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const response = await request.get('/work/sample-project/', { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(response.status());
  expect(response.headers()['location']).toMatch(/\/work\/sample-project$/);
});

test('build assets are served from /_astro with a one-year cache', async ({
  page,
  request,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  await page.goto('/work/sample-project');
  const src = await page
    .getByRole('img', { name: 'Grey placeholder cover image' })
    .getAttribute('src');
  expect(src).toMatch(/^\/_astro\//);
  const response = await request.get(src ?? '');
  expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});

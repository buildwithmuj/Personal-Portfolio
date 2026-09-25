import { expect, test } from '@playwright/test';
import { sectionHeading, yamlValues } from '../support/content.ts';
import { builtPagePaths, SERVER_ONLY } from '../support/site.ts';

const WORK = sectionHeading('work');
const study = (slug: string, key: string) =>
  yamlValues(`src/content/case-studies/${slug}/index.mdx`, key)[0] ?? '';
const HEALTHCARE = study('healthcare-automation', 'title');

test('the home page links to each case study', async ({ page }) => {
  await page.goto('/');
  const work = page.getByRole('region', { name: WORK });
  await work.getByRole('link', { name: HEALTHCARE }).click();
  await expect(page).toHaveURL(/\/work\/healthcare-automation$/);
  await expect(page.getByRole('heading', { level: 1, name: HEALTHCARE })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('region', { name: WORK })).toBeVisible();
});

test('the switch shows four client or four personal projects', async ({ page }) => {
  await page.goto('/');
  const work = page.locator('#work');
  const labels = work.locator('.card-label:visible');
  await expect(labels).toHaveCount(4);
  for (const label of await labels.allTextContents()) expect(label).toMatch(/^Client work · /);
  await work.getByText('Personal projects', { exact: true }).click();
  await expect(labels).toHaveCount(4);
  for (const label of await labels.allTextContents()) expect(label).toMatch(/^Personal project · /);
  await expect(work.getByRole('link', { name: 'View all', exact: true })).toHaveAttribute(
    'href',
    '/work',
  );
});

test('the All work page lists every case study', async ({ page }) => {
  await page.goto('/work');
  await expect(page.getByRole('heading', { level: 1, name: 'All work' })).toBeVisible();
  const labels = page.locator('#all-work .card-label');
  await expect(labels).toHaveCount(8);
});

test('a case study shows its details and MDX components', async ({ page }) => {
  await page.goto('/work/this-site');
  await expect(page.locator('.case-study .label')).toHaveText('Personal project · In progress');
  await expect(page.getByText(study('this-site', 'role'))).toBeVisible();
  await expect(page.getByRole('img', { name: study('this-site', 'coverAlt') })).toBeVisible();
  await expect(page.locator('figure figcaption')).toHaveText(
    'Placeholder diagram of how the site is built and checked',
  );
  await expect(page.locator('aside.callout')).toContainText(
    'Every change is checked automatically',
  );
  await expect(page.getByRole('link', { name: 'Source code' })).toHaveAttribute(
    'href',
    'https://github.com/buildwithmuj/Personal-Portfolio',
  );
  await expect(page.getByRole('link', { name: 'Back to all work' })).toHaveAttribute(
    'href',
    '/work',
  );
});

test('client case studies show their employer', async ({ page }) => {
  await page.goto('/work/healthcare-automation');
  await expect(page.locator('.case-study .label')).toHaveText('Client work · Healthcare');
  await expect(page.locator('.case-study .facts')).toContainText(
    study('healthcare-automation', 'employer'),
  );
});

test('drafts are not published in production', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  expect(builtPagePaths()).toContain('/work/healthcare-automation');
  expect(builtPagePaths()).not.toContain('/work/draft-example');
  expect((await request.get('/work/draft-example')).status()).toBe(404);
});

test('a trailing slash redirects to the canonical URL', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const response = await request.get('/work/healthcare-automation/', { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(response.status());
  expect(response.headers()['location']).toMatch(/\/work\/healthcare-automation$/);
});

test('build assets are served from /_astro with a one-year cache', async ({
  page,
  request,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  await page.goto('/work/healthcare-automation');
  const src = await page
    .getByRole('img', { name: study('healthcare-automation', 'coverAlt') })
    .getAttribute('src');
  expect(src).toMatch(/^\/_astro\//);
  const response = await request.get(src ?? '');
  expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});

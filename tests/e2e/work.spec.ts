import { readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { sectionHeading, yamlValues } from '../support/content.ts';
import { builtPagePaths, SERVER_ONLY } from '../support/site.ts';
import { scrollIntoViewSettled } from '../support/settle.ts';

const WORK = sectionHeading('work');
const study = (slug: string, key: string) =>
  yamlValues(`src/content/case-studies/${slug}/index.mdx`, key)[0] ?? '';
const HEALTHCARE = study('healthcare-automation', 'title');
// The published case studies (drafts never go live), in their order.
const ORDERED = readdirSync('src/content/case-studies')
  .filter((slug) => study(slug, 'draft') !== 'true')
  .sort((a, b) => Number(study(a, 'order')) - Number(study(b, 'order')));

test('the home page links to each case study', async ({ page }) => {
  await page.goto('/');
  const work = page.getByRole('region', { name: WORK });
  await work.getByRole('link', { name: HEALTHCARE }).click();
  await expect(page).toHaveURL(/\/work\/healthcare-automation$/);
  await expect(page.getByRole('heading', { level: 1, name: HEALTHCARE })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('region', { name: WORK })).toBeVisible();
});

// Each tile's one chip is a client project's sector, or a personal project's status: no dates.
const STATUSES = ['Live', 'In progress', 'Retired'];

test('the switch shows four client or four personal projects', async ({ page }) => {
  await page.goto('/');
  const work = page.locator('#work');
  await scrollIntoViewSettled(work);
  const details = work.locator('.tile:visible .chips span');
  await expect(details).toHaveCount(4);
  for (const detail of await details.allTextContents()) expect(STATUSES).not.toContain(detail);
  await work.getByText('Personal projects', { exact: true }).click();
  await expect(details).toHaveCount(4);
  for (const detail of await details.allTextContents()) expect(STATUSES).toContain(detail);
  await expect(work.getByRole('link', { name: 'View all', exact: true })).toHaveAttribute(
    'href',
    '/projects',
  );
});

// On desktop, Selected work is a bento grid: the featured project spans two columns and two rows.
test('Selected work is a bento grid on desktop', async ({ page }) => {
  await page.goto('/');
  await scrollIntoViewSettled(page.locator('#work'));
  const tiles = page.locator('#work .showcase[data-kind="client"] .tile');
  await expect(tiles).toHaveCount(4);
  const feature = await tiles.nth(0).boundingBox();
  const next = await tiles.nth(1).boundingBox();
  expect(feature?.width).toBeGreaterThan((next?.width ?? 0) * 1.8);
  expect(feature?.height).toBeGreaterThan((next?.height ?? 0) * 1.8);
});

// On phones, the same tiles are a swipe deck: a row that snaps card by card, inside the page.
test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  // On phones the four cards at a case study's end are a swipe row, like Selected work's deck.
  test('the next four case studies are a swipe row', async ({ page }) => {
    await page.goto(`/work/${ORDERED[0]}`);
    const row = page.getByRole('navigation', { name: 'More case studies' }).getByRole('list');
    const layout = await row.evaluate((element) => ({
      overflow: getComputedStyle(element).overflowX,
      snap: getComputedStyle(element).scrollSnapType,
      scrolls: element.scrollWidth > element.clientWidth,
    }));
    expect(layout).toEqual({ overflow: 'auto', snap: 'x mandatory', scrolls: true });
    const pageFits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(pageFits).toBe(true);
  });

  test('Selected work is a swipe deck', async ({ page }) => {
    await page.goto('/');
    const deck = page.locator('#work .showcase[data-kind="client"] .tiles');
    await scrollIntoViewSettled(deck);
    const layout = await deck.evaluate((element) => ({
      overflow: getComputedStyle(element).overflowX,
      snap: getComputedStyle(element).scrollSnapType,
      scrolls: element.scrollWidth > element.clientWidth,
    }));
    expect(layout).toEqual({ overflow: 'auto', snap: 'x mandatory', scrolls: true });
    const pageFits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(pageFits).toBe(true);
  });

  // The dots follow the swipe, so they keep up even with animations paused (the footer's toggle).
  test('the deck lights the dot of the card in view, even with animations paused', async ({
    page,
  }) => {
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
    test.skip(!supported, 'This browser has no scroll-driven animations, so the dots only count');
    await page.goto('/');
    await page.evaluate(() => document.documentElement.classList.add('motion-paused'));
    const showcase = page.locator('#work .showcase[data-kind="client"]');
    const deck = showcase.locator('.tiles');
    await scrollIntoViewSettled(deck);
    await deck.evaluate((element) =>
      element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }),
    );
    const dot = (n: number) =>
      showcase
        .locator(`.dots span:nth-child(${n})`)
        .evaluate((span) => getComputedStyle(span).width);
    await expect.poll(() => dot(4)).toBe('18px');
    expect(await dot(1)).not.toBe('18px');
  });

  // Every card, the last included, comes to rest at the same inset from the left, one card per
  // swipe: the row has room after its last card to line it up like the others.
  test('each card in the deck, the last included, rests at the same inset', async ({ page }) => {
    await page.goto('/');
    const deck = page.locator('#work .showcase[data-kind="client"] .tiles');
    await scrollIntoViewSettled(deck);
    const cards = deck.locator(':scope > .tile');
    await expect(cards.first()).toHaveCSS('scroll-snap-stop', 'always');
    const count = await cards.count();
    for (let index = 0; index < count; index++) {
      await cards.nth(index).evaluate((card) => {
        const row = card.parentElement as HTMLElement;
        const inset = parseFloat(getComputedStyle(row).scrollPaddingLeft);
        row.scrollTo({ left: (card as HTMLElement).offsetLeft - inset, behavior: 'instant' });
      });
      await expect
        .poll(() =>
          cards.nth(index).evaluate((card) => {
            const row = card.parentElement as HTMLElement;
            const inset = parseFloat(getComputedStyle(row).scrollPaddingLeft);
            const offset = card.getBoundingClientRect().left - row.getBoundingClientRect().left;
            return Math.round(Math.abs(offset - inset));
          }),
        )
        .toBe(0);
    }
  });
});

test('the All work page lists every case study', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByRole('heading', { level: 1, name: 'All work' })).toBeVisible();
  const labels = page.locator('#all-work .card-label');
  await expect(labels).toHaveCount(8);
});

// Every case study ends with the next four, in order and wrapping round, as small cards to move
// between them; a thin bar tracks how far the story is read.
const moreLinks = (slug: string) =>
  [1, 2, 3, 4].map((step) => `/work/${ORDERED[(ORDERED.indexOf(slug) + step) % ORDERED.length]}`);

test('a case study ends with the next four and shows reading progress', async ({ page }) => {
  for (const slug of [ORDERED[0] ?? '', ORDERED.at(-1) ?? '']) {
    await page.goto(`/work/${slug}`);
    const links = page.getByRole('navigation', { name: 'More case studies' }).getByRole('link');
    await expect(links).toHaveCount(4);
    const hrefs = await links.evaluateAll((all) => all.map((link) => link.getAttribute('href')));
    expect(hrefs).toEqual(moreLinks(slug));
  }
  await expect(page.locator('.read-progress')).toHaveAttribute('aria-hidden', 'true');
});

test('a case study shows its details and MDX components', async ({ page }) => {
  await page.goto('/work/this-site');
  await expect(page.locator('.case-study .label')).toHaveText('Personal project · In progress');
  await expect(page.getByText(study('this-site', 'role'))).toBeVisible();
  // The facts leave the dates out.
  await expect(page.locator('.case-study .facts')).not.toContainText('Timeframe');
  await expect(page.getByRole('img', { name: study('this-site', 'coverAlt') })).toBeVisible();
  await expect(page.locator('figure figcaption')).toHaveText(
    'How the site is built and checked, from a written spec to the live site',
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
    '/projects',
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

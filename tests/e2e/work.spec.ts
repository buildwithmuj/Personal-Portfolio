import { readdirSync } from 'node:fs';
import { expect, test } from '../support/test.ts';
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
const STATUSES = ['Live', 'In progress', 'Retired', 'Concept'];

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

// The two big tiles (the featured one and the wide one along the foot) carry a line under their
// title; the two small ones have the title alone. And a big tile gets a picture big enough for it:
// the wide one used to be sent the small tiles' picture, stretched to more than twice its size.
test('the big tiles carry a summary and a picture that fills them sharply', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await scrollIntoViewSettled(page.locator('#work'));
  const tiles = page.locator('#work .showcase[data-kind="client"] .tile');
  const summaries = await tiles.evaluateAll((all) =>
    all.map((tile) => tile.querySelector('.summary')?.textContent?.trim() ?? ''),
  );
  expect(summaries.map(Boolean)).toEqual([true, false, false, true]);
  expect(summaries[3]).toBe(study(ORDERED[3] ?? '', 'summary'));
  for (const index of [0, 3]) {
    const image = tiles.nth(index).locator('img');
    await scrollIntoViewSettled(image);
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    const sharp = await image.evaluate(
      (img: HTMLImageElement) => img.naturalWidth >= img.getBoundingClientRect().width,
    );
    expect(sharp, `tile ${index + 1}`).toBe(true);
  }
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

  // Every card in the deck sits level, the ones still off to the right included: they arrive by a
  // sideways swipe, so a scroll reveal (a card rising as it comes into view) would lift each one
  // into line just as it slid in, a jolt on every swipe.
  test('the deck cards sit level, and none rises as it is swiped in', async ({ page }) => {
    await page.goto('/');
    const deck = page.locator('#work .showcase[data-kind="client"] .tiles');
    await scrollIntoViewSettled(deck);
    const cards = await deck.evaluate((element) =>
      [...element.children].map((card) => ({
        top: Math.round(card.getBoundingClientRect().top),
        transform: getComputedStyle(card).transform,
      })),
    );
    expect(cards.length).toBeGreaterThan(1);
    for (const card of cards) {
      expect(card.transform).toBe('none');
      expect(card.top).toBe(cards[0]?.top);
    }
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

// A case study opens calmly: the head is the label, the title and one line. The facts (the role,
// who it was with, what it involved) wait in one strip under the picture, as words, not pills.
test('a case study opens on its title, with the facts in one strip under the picture', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/work/healthcare-automation');
  const head = page.locator('.case-study .head');
  await expect(head.locator(':scope > *')).toHaveCount(3);
  await expect(head.locator('dl, ul')).toHaveCount(0);
  const facts = page.locator('.case-study .facts');
  await expect(facts.locator('dt')).toHaveText(['Role', 'With', 'Focus']);
  const cover = await page.locator('.case-study .cover').boundingBox();
  const strip = await facts.boundingBox();
  expect(strip?.y ?? 0).toBeGreaterThan((cover?.y ?? 0) + (cover?.height ?? 0));
  // The three facts sit side by side.
  const tops = await facts
    .locator(':scope > div')
    .evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
});

// The story reads as numbered steps: each heading at the left, what it covers beside it.
test('a case study tells its story in steps, each heading beside its words', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/work/healthcare-automation');
  const body = page.locator('.case-study .body');
  const headings = body.locator('h2');
  await expect(headings).toHaveText(['The problem', 'What I did', 'The outcome']);
  const first = await headings.first().boundingBox();
  const words = await body.locator('h2 + *').first().boundingBox();
  expect(words?.x ?? 0).toBeGreaterThan((first?.x ?? 0) + 100);
  expect(Math.abs((words?.y ?? 0) - (first?.y ?? 100))).toBeLessThan(40);
  const number = await headings
    .first()
    .evaluate((heading) => getComputedStyle(heading, '::before').content);
  expect(number).toContain('counter');
});

// Where there are real numbers to show, they stand out under the facts. This site's are its floors.
test('a case study with numbers shows them as a row of figures', async ({ page }) => {
  await page.goto('/work/this-site');
  const figures = page.locator('.case-study .stats li');
  await expect(figures).toHaveCount(3);
  await expect(figures.first().locator('b')).toHaveText(/\S/);
  await page.goto('/work/healthcare-automation');
  await expect(page.locator('.case-study .stats')).toHaveCount(0);
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

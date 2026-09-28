import { expect, test, type Locator } from '@playwright/test';
import { profileValue, sectionHeading, yamlList, yamlValues } from '../support/content.ts';

// Long sections can be collapsed with a round toggle (named after the section, announcing whether
// it's expanded).
test('Selected work starts open and can be hidden', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: sectionHeading('work'), exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  // It slides open as it scrolls into view (below).
  await page.locator('#work').scrollIntoViewIfNeeded();
  await expect(page.locator('#work-body')).toBeVisible();
  await toggle.click();
  await expect(page.locator('#work-body')).toBeHidden();
  // The Work / Personal projects switch hides with the section.
  await expect(page.locator('#work fieldset')).toBeHidden();
});

test('clicking a collapsible section title toggles it too', async ({ page }) => {
  await page.goto('/');
  await page.locator('#skills .section-title').click();
  await expect(page.locator('#skills-body')).toBeHidden();
  await page.locator('#skills h2').click();
  await expect(page.locator('#skills-body')).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every section stays open and no toggle shows', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#skills .collapse')).toBeHidden();
    await expect(page.locator('#work .collapse')).toBeHidden();
    await expect(page.locator('#skills-body')).toBeVisible();
  });
});

// On the home page, a collapsible section is closed below its heading until it scrolls into view,
// then slides open and stays open.
test('sections open as they scroll into view', async ({ page }) => {
  await page.goto('/');
  const body = page.locator('#skills-body');
  const height = async () => (await body.boundingBox())?.height ?? 0;
  expect(await height()).toBe(0);
  await page.locator('#skills').scrollIntoViewIfNeeded();
  await expect.poll(height).toBeGreaterThan(100);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(height).toBeGreaterThan(100);
});

test.describe('under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('every section is open from the start', async ({ page }) => {
    await page.goto('/');
    expect((await page.locator('#skills-body').boundingBox())?.height).toBeGreaterThan(100);
  });
});

// As in the Portfolik reference, the About card runs straight into Selected work as one grey panel
// (no gap, square where they meet), even with a section's script between them in the page.
test('About runs straight into Selected work, as one panel', async ({ page }) => {
  await page.goto('/');
  const edges = await page.evaluate(() => {
    const about = document.getElementById('about');
    const work = document.getElementById('work');
    if (!about || !work) return null;
    return {
      gap: work.getBoundingClientRect().top - about.getBoundingClientRect().bottom,
      aboutFoot: getComputedStyle(about).borderEndStartRadius,
      workHead: getComputedStyle(work).borderStartStartRadius,
    };
  });
  expect(edges).toEqual({ gap: 0, aboutFoot: '0px', workHead: '0px' });
});

// Scroll-linked effects. The minifier once folded their timelines into the animation shorthand,
// which browsers reject, so both silently never ran.
test('the back-to-top ring closes at the end of the page', async ({ page }) => {
  await page.goto('/');
  const supported = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
  test.skip(
    !supported,
    'This browser has no CSS scroll timeline, so the ring shows only its track',
  );
  const ring = page.locator('.to-top .done');
  // Sections open as they arrive, so the page grows at the bottom: keep going to the end.
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      return parseFloat(await ring.evaluate((el) => getComputedStyle(el).strokeDashoffset));
    })
    .toBeLessThan(1);
});

// The greeting, up to the owner's job title, is in full colour from the start; the rest of the
// statement reads itself in as it scrolls up the screen.
test('the About statement opens in full colour and fills the rest as it scrolls into view', async ({
  page,
}) => {
  await page.goto('/');
  const lead = page.locator('.statement .lead');
  await expect(lead).toHaveText(new RegExp(`^Hey, .*${profileValue('jobTitle')}$`));
  await expect(lead).toHaveCSS('color', 'rgb(10, 10, 10)');
  await expect(lead).toHaveCSS('animation-name', 'none');
  const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
  test.skip(!supported, 'This browser has no CSS view timeline, so the statement is plain text');
  const rest = page.locator('.statement .rest');
  await expect
    .poll(async () => rest.evaluate((el) => getComputedStyle(el).animationTimeline))
    .toBe('--statement');
});

// Play my intro and View CV sit on one line: their icons share a centre.
test('the About row lines up Play my intro with View CV', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('#about .contact-row');
  const play = row.locator('voice-intro .play');
  await expect(play).toBeVisible();
  const cv = row.locator('li', { has: page.getByRole('link', { name: 'View CV' }) }).locator('svg');
  const centre = async (icon: Locator) => {
    const box = await icon.boundingBox();
    return box ? box.y + box.height / 2 : Number.NaN;
  };
  expect(Math.abs((await centre(play)) - (await centre(cv)))).toBeLessThan(0.5);
});

// The About stats: one band of the live Blue sky, each number over its label, from the profile.
test('the About stats sit on one band of the live sky', async ({ page }) => {
  await page.goto('/');
  const stats = page.locator('#about .stats');
  await expect(stats.locator('sky-gradient')).toHaveCount(1);
  await expect(stats.locator('.stat-num')).toHaveText(
    yamlValues('src/content/profile.yaml', 'value'),
  );
});

// The Skills section: every skill and every certification is a flat chip, straight from the CV.
test('the Skills section shows each skill, then each certification, as a chip', async ({
  page,
}) => {
  await page.goto('/');
  const skills = page.getByRole('region', { name: sectionHeading('skills') });
  await expect(skills.locator('.chip.skill')).toHaveText(
    yamlList('src/content/skills.yaml', 'skills'),
  );
  await expect(skills.locator('.chip.cert')).toHaveText(
    yamlList('src/content/skills.yaml', 'certifications'),
  );
});

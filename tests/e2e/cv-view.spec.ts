import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../support/test.ts';
import { cvFingerprint, savedFingerprints } from '../../scripts/cv-pdf.ts';
import { profileParagraph, profileValue, yamlList } from '../support/content.ts';
import { scrollIntoViewSettled } from '../support/settle.ts';

const NAME = profileValue('name');

// View CV opens the CV over the page, after the CV Portfolio Template, rather than leaving it.
test('View CV in About opens the CV over the page, and its close button shuts it', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#about').getByRole('link', { name: 'View CV' }).click();
  const cv = page.getByRole('dialog', { name: NAME });
  await expect(cv).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  // The blue full stop after the name is decoration, left out of the heading's name.
  await expect(cv.getByRole('heading', { level: 2, name: NAME, exact: true })).toBeVisible();
  // The sections an applicant tracking system looks for, under their usual names, in order.
  await expect(cv.getByRole('heading', { level: 3 })).toHaveText([
    'Profile',
    'Experience',
    'Education',
    'Skills',
    'Certifications',
    'Languages',
    'Interests',
  ]);
  await expect(cv.getByRole('link', { name: 'Download PDF' })).toHaveAttribute('href', '/cv.pdf');
  await expect(cv.getByRole('button', { name: 'Close CV' })).toBeFocused();
  await cv.getByRole('button', { name: 'Close CV' }).click();
  await expect(cv).toBeHidden();
});

// The CV reads as the owner's formal CV does: its own profile paragraph (not the home page's line)
// and its own skills. On a computer the bar's two buttons sit at the pop-up's right edge, and the
// foot is the name alone: no ball, no date.
test('the CV keeps to the formal CV, its buttons at the right edge of the bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.locator('#about').getByRole('link', { name: 'View CV' }).click();
  const cv = page.getByRole('dialog', { name: NAME });
  await expect(cv).toBeVisible();
  await cv.evaluate((dialog) => Promise.all(dialog.getAnimations().map((a) => a.finished)));
  const section = (name: string) =>
    cv.locator('section').filter({ has: page.getByRole('heading', { level: 3, name }) });
  await expect(section('Profile').locator('p')).toHaveText(profileParagraph('cvProfile'));
  await expect(section('Skills').locator('li')).toHaveText(
    yamlList('src/content/skills.yaml', 'cvSkills'),
  );
  const frame = await cv.boundingBox();
  const close = await cv.getByRole('button', { name: 'Close CV' }).boundingBox();
  const edge = (frame?.x ?? 0) + (frame?.width ?? 0) - ((close?.x ?? 0) + (close?.width ?? 0));
  expect(edge).toBeGreaterThanOrEqual(0);
  expect(edge).toBeLessThanOrEqual(16);
  await expect(cv.locator('.foot')).toHaveText(`${NAME} · Curriculum Vitae`);
});

test("the CV icon in Let's work together opens it too, and Escape closes it", async ({ page }) => {
  await page.goto('/');
  const link = page.locator('#contact').getByRole('link', { name: 'View CV' });
  await scrollIntoViewSettled(link);
  await link.click();
  const cv = page.getByRole('dialog', { name: NAME });
  await expect(cv).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(cv).toBeHidden();
});

test('a click on the dimmed page beside the CV closes it', async ({ page }) => {
  await page.goto('/');
  await page.locator('#about').getByRole('link', { name: 'View CV' }).click();
  const cv = page.getByRole('dialog', { name: NAME });
  await expect(cv).toBeVisible();
  await page.mouse.click(4, 300);
  await expect(cv).toBeHidden();
});

test('the open CV has no WCAG 2.2 AA violations', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'axe results do not depend on the browser engine');
  await page.goto('/');
  await page.locator('#about').getByRole('link', { name: 'View CV' }).click();
  const cv = page.getByRole('dialog', { name: NAME });
  await expect(cv).toBeVisible();
  // Measured mid-fade, the text would be all but transparent: let the entrance finish first.
  await cv.evaluate((dialog) => Promise.all(dialog.getAnimations().map((a) => a.finished)));
  const results = await new AxeBuilder({ page })
    .include('.cv-view')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

// Each role lists its highlights, and education and languages are filled in.
test('the CV lists each role with its highlights, and the education and languages', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#about').getByRole('link', { name: 'View CV' }).click();
  const cv = page.getByRole('dialog', { name: NAME });
  const section = (name: string) =>
    cv.locator('section').filter({ has: page.getByRole('heading', { level: 3, name }) });
  const roles = section('Experience').locator('.entry');
  await expect(roles).toHaveCount(3);
  for (const role of await roles.all()) {
    await expect(role.locator('.points li').first()).toBeVisible();
  }
  await expect(section('Education').locator('.entry').first()).toBeVisible();
  await expect(section('Languages').locator('li').first()).toBeVisible();
});

// The PDF download is printed from this pop-up (scripts/cv-pdf.ts), which notes a fingerprint of
// what it printed from: the words, its print styles and the site's address. If any has changed
// since, the PDF is out of date.
test('the PDF download was made from the CV as it reads now', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'The CV reads the same in every browser');
  await page.goto('/');
  expect(
    await cvFingerprint(page),
    'The CV has changed since public/cv.pdf was made. Run `pnpm build`, then `pnpm cv:pdf`.',
  ).toBe(savedFingerprints().sources);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  // With no pop-up to open, View CV links to the PDF itself (there's no separate CV page).
  test('View CV links to the PDF', async ({ page }) => {
    await page.goto('/');
    const links = await page.getByRole('link', { name: 'View CV' }).all();
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      await expect(link).toHaveAttribute('href', '/cv.pdf');
    }
  });
});

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { profileValue } from '../support/content.ts';

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
    'Tools',
    'Certifications',
    'Languages',
    'Interests',
  ]);
  await expect(cv.getByRole('link', { name: 'Download PDF' })).toHaveAttribute('href', '/cv.pdf');
  await expect(cv.getByRole('button', { name: 'Close CV' })).toBeFocused();
  await cv.getByRole('button', { name: 'Close CV' }).click();
  await expect(cv).toBeHidden();
});

test("the CV icon in Let's work together opens it too, and Escape closes it", async ({ page }) => {
  await page.goto('/');
  const link = page.locator('#contact').getByRole('link', { name: 'View CV' });
  await link.scrollIntoViewIfNeeded();
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

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('View CV goes to the CV page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#about').getByRole('link', { name: 'View CV' }).click();
    await expect(page).toHaveURL(/\/cv$/);
  });
});

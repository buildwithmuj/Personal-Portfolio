import { expect, test } from '@playwright/test';
import { profileValue, sectionHeading } from '../support/content.ts';

// The headline and section headings are split into words for their reveal animations; the text
// people and screen readers get must still match the content exactly.
test('the hero headline reads exactly as written', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#top .headline')).toHaveText(profileValue('headline'));
});

test('section headings read exactly as written', async ({ page }) => {
  await page.goto('/');
  for (const section of ['work', 'method', 'contact']) {
    await expect(page.getByRole('region', { name: sectionHeading(section) })).toBeVisible();
  }
});

test('the phone menu opens the navigation and closes when a link is followed', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const menu = page.locator('.top-bar details');
  await menu.locator('summary').click();
  const panel = menu.getByRole('navigation', { name: 'Main' });
  await expect(panel.getByRole('link', { name: 'Work' })).toBeVisible();
  await panel.getByRole('link', { name: 'Work' }).click();
  await expect(menu).not.toHaveAttribute('open');
  await expect(page).toHaveURL(/#work$/);
});

for (const path of ['/cv', '/projects', '/work/amniki']) {
  test(`${path} has a Back to home shortcut`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('main').getByRole('link', { name: 'Back to home' }).click();
    await expect(page.locator('#top .headline')).toBeVisible();
  });
}

test('Home in the top bar leads back to the home page from the CV', async ({ page }) => {
  await page.goto('/cv');
  await page.locator('.top-bar .links').getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/#page-top$/);
  await expect(page.locator('#top .headline')).toBeVisible();
});

test('the top bar links to each part of the home page, in order', async ({ page }) => {
  await page.goto('/cv');
  await expect(page.locator('.top-bar .links a')).toHaveText([
    'Home',
    'About',
    'Work',
    'Skills',
    'Contact',
  ]);
});

// Five links, the weather and four icons only fit from 768px; narrower, the bar uses its menu.
for (const width of [770, 960, 1280]) {
  test(`at ${width}px the top bar fits its links and icons`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const bar = await page.locator('.top-bar').boundingBox();
    const icons = await page.locator('.top-bar > .socials').boundingBox();
    if (!bar || !icons) throw new Error('top bar not laid out');
    expect(icons.x + icons.width).toBeLessThanOrEqual(bar.x + bar.width);
  });
}

// WCAG 2.2.2: the moving parts (sector strip, role line, weather, rotations) can be paused, and the
// choice holds on the next page load.
test('the hero pause button stops every animation and remembers it', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Pause animations' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass(/motion-paused/);
  await expect(page.locator('.hero')).toHaveCSS('animation-play-state', 'paused');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/motion-paused/);
  await expect(page.getByRole('button', { name: 'Pause animations' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

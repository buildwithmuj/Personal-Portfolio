import { expect, test } from '@playwright/test';
import { profileValue, sectionHeading } from '../support/content.ts';

// The headline and section headings are split into words for their reveal animations; the text
// people and screen readers get must still match the content exactly.
// Headless browsers render WebGL in software, like a machine without a usable graphics card. There
// the sky's shader would run on the CPU (and compile on the main thread), so the sky keeps its CSS
// gradient instead. (On CI's runners the shader cost the home page ~900ms of blocking time.)
test('with software rendering, the skies keep their CSS gradient and skip the shader', async ({
  page,
}) => {
  await page.goto('/');
  const software = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return /swiftshader|llvmpipe|softpipe|software/i.test(
      String(gl && gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
    );
  });
  test.skip(!software, 'This browser renders WebGL on a graphics card');
  for (const sky of await page.locator('sky-gradient').all()) {
    await expect(sky).not.toHaveAttribute('data-ready');
    await expect(sky).toHaveCSS('background-image', /linear-gradient/);
  }
});

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
test('the hero pause button holds the moving parts and remembers it', async ({ page }) => {
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

// The pause is for what loops. One-off entrances still finish and scroll-linked effects still follow
// the page, so a visitor who paused never gets a page frozen on an entrance's first frame.
test('with animations paused, entrances still finish and only loops are held', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('motion', 'paused'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/motion-paused/);
  await expect(page.locator('#top .headline .w > span').first()).toBeInViewport();
  // Settled in place: an entrance that has finished may report its end state as an identity matrix.
  await expect(page.locator('#top .identity')).toHaveCSS(
    'transform',
    /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/,
  );

  // Bring every scroll reveal on screen for at least one rendered frame, so the reveal observer sees
  // it even on a slow machine, then list what the pause holds. Reveals in a hidden tab (the other
  // side of the Work switch) can't scroll into view; skip them.
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (const element of document.querySelectorAll('[data-reveal]')) {
      if (element.getClientRects().length === 0) continue;
      element.scrollIntoView({ block: 'center' });
      await frame();
      await frame();
    }
  });
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.reveal-ready [data-reveal]:not(.in)')].every(
      (element) => element.getClientRects().length === 0,
    ),
  );
  const held = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'paused' && a.effect?.getTiming().iterations !== Infinity)
      .map((a) => (a instanceof CSSAnimation ? a.animationName : a.id)),
  );
  expect(held).toEqual([]);
});

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
  for (const section of ['work', 'skills', 'contact']) {
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

// The phone menu leads its icons with the CV, which opens over the home page.
test('the phone menu offers the CV beside the social links', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const menu = page.locator('.top-bar details');
  await menu.locator('summary').click();
  const icons = menu.locator('.socials a');
  await expect(icons.first()).toHaveAccessibleName('View CV');
  await expect(icons).toHaveCount(5);
  await icons.first().click();
  await expect(menu).not.toHaveAttribute('open');
  await expect(page.getByRole('dialog', { name: profileValue('name') })).toBeVisible();
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
    'Toolkit',
    'Ask',
    'Contact',
  ]);
  await expect(page.locator('.top-bar .links').getByRole('link', { name: 'Ask' })).toHaveAttribute(
    'href',
    '/#interview',
  );
});

// The clock, six centred links and the weather only fit from 768px; narrower, the bar uses its
// menu. The links sit in the middle, clear of the clock and the weather.
for (const width of [770, 960, 1280]) {
  test(`at ${width}px the top bar fits its links between the clock and the weather`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const bar = await page.locator('.top-bar').boundingBox();
    const clock = await page.locator('.top-bar live-clock').boundingBox();
    const links = await page.locator('.top-bar .links').boundingBox();
    const weather = await page.locator('.top-bar .where').boundingBox();
    if (!bar || !clock || !links || !weather) throw new Error('top bar not laid out');
    expect(clock.x + clock.width).toBeLessThanOrEqual(links.x);
    expect(links.x + links.width).toBeLessThanOrEqual(weather.x);
    expect(weather.x + weather.width).toBeLessThanOrEqual(bar.x + bar.width);
  });
}

// The client logos sit in one quiet ink; the one under the pointer turns the brand blue.
// The strip is held still (its reduced-motion layout), or a scrolling logo can slide out of view
// before the pointer reaches it.
test('a client logo turns the brand blue under the pointer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const logo = page.locator('.proof .track img').first();
  await expect(logo).toHaveCSS('filter', 'brightness(0)');
  await logo.hover();
  await expect(logo).toHaveCSS('filter', /hue-rotate\(187deg\)/);
  await expect(logo).toHaveCSS('opacity', '1');
});

// The hero says whether the owner is open to work.
test('the hero shows availability', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero .availability')).toHaveText(/\S/);
});

// Wide screens show the whole availability line. Phones show a shorter one whose last word rotates
// (roles, projects, …), while screen readers still get the whole line.
test('the availability pill shortens on phones and rotates its last word', async ({ page }) => {
  const line = profileValue('availability');
  await page.goto('/');
  const pill = page.locator('.hero .availability');
  await expect(pill.locator('.availability-full')).toBeVisible();
  await expect(pill.locator('.availability-short')).toBeHidden();

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(pill.locator('.availability-short')).toBeVisible();
  await expect(pill.locator('.availability-short')).toHaveAttribute('aria-hidden', 'true');
  await expect(pill.locator('.availability-full')).toHaveText(line);
  const word = pill.locator('role-rotator > span').first();
  const first = (await word.textContent()) ?? '';
  await expect(word).not.toHaveText(first, { timeout: 6000 });
});

// The About card's typical day ticks itself off on London time: every task before the one under
// way is done, and the rest are still to come. (The scrolling list is drawn twice; screen readers
// and this test read the first copy.)
test('the About card ticks off a typical day on London time', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-28T13:00:00Z')); // 14:00 in London
  await page.goto('/');
  const day = page.getByRole('article', { name: 'Tasks for today' });
  await expect(day.locator('[data-local-time]')).toHaveText('14:00');
  await expect(day.locator('li:not([aria-hidden])[data-state="now"]')).toHaveCount(1);
  const tasks = await day
    .locator('li:not([aria-hidden])[data-time]')
    .evaluateAll((items) =>
      items.map((item) => [
        (item as HTMLElement).dataset['time'],
        (item as HTMLElement).dataset['state'],
      ]),
    );
  const current = tasks.find(([, state]) => state === 'now')?.[0] ?? '';
  expect(current <= '14:00').toBe(true);
  for (const [time, state] of tasks) {
    if (time === current) continue;
    expect(state).toBe((time ?? '') < current ? 'done' : '');
  }
  await expect(day).toContainText(/\d+ of \d+ done/);
  await expect(day.getByRole('link', { name: "Let's talk" })).toHaveAttribute('href', '#contact');
});

// The social links sit in the hero's sky band, each named for screen readers.
test('the hero sky band holds the social links', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('.hero .band-socials a');
  await expect(links).toHaveCount(4);
  await expect(links.first()).toHaveAccessibleName(/on X$/);
  await expect(page.locator('.top-bar > .socials')).toHaveCount(0);
});

// WCAG 2.2.2: the moving parts (sky, sector strip, role line, weather, rotations) can be paused
// from the footer of any page, and the choice holds on the next page load.
test('the footer pause toggle holds the moving parts and remembers it', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero button')).toHaveCount(0);
  const toggle = page.getByRole('contentinfo').getByRole('button', { name: 'Pause animations' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass(/motion-paused/);
  await expect(page.locator('.hero')).toHaveCSS('animation-play-state', 'paused');
  await page.goto('/cv');
  await expect(page.locator('html')).toHaveClass(/motion-paused/);
  await expect(
    page.getByRole('contentinfo').getByRole('button', { name: 'Pause animations' }),
  ).toHaveAttribute('aria-pressed', 'true');
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
  // side of the Work switch) can't scroll into view; skip them. A reveal inside a section that is
  // still sliding open is clipped until the slide is done, so wait for its section to settle first.
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (const element of document.querySelectorAll('[data-reveal]')) {
      if (element.getClientRects().length === 0) continue;
      element.scrollIntoView({ block: 'center' });
      await frame();
      await frame();
      const section = element.closest('.stack > .shell');
      if (!section?.querySelector(':scope > .shell-body')) continue;
      while (!section.classList.contains('is-settled')) await frame();
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

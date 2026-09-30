import { expect, test } from '../support/test.ts';
import { profileValue, sectionHeading } from '../support/content.ts';
import { scrollIntoViewSettled } from '../support/settle.ts';

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

// A sky sets up its graphics only as it nears the screen, so the skies below the fold cost the page
// nothing as it loads. Each canvas a sky asks for a WebGL context is marked.
test('a sky sets up its graphics only as it nears the screen', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      options?: unknown,
    ) {
      this.closest('sky-gradient')?.setAttribute('data-asked', '');
      return original.call(this, contextId, options);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('#top sky-gradient').first()).toHaveAttribute('data-asked');
  const desk = page.locator('#skills .desk sky-gradient');
  await expect(desk).not.toHaveAttribute('data-asked');
  await scrollIntoViewSettled(page.locator('#skills'));
  await expect(desk).toHaveAttribute('data-asked');
});

// A pop-up over the page (the CV, a certificate) dims and blurs what's behind it, so the skies there
// hold still until it closes. Headless browsers have no graphics card, so a stand-in one counts the
// frames each sky draws.
test('the skies hold still while the CV covers the page', async ({ page }) => {
  await page.addInitScript(() => {
    const counter = window as unknown as { draws: number };
    counter.draws = 0;
    const card = new Proxy(
      {},
      {
        get: (_, key) => {
          if (key === 'drawArrays') return () => counter.draws++;
          if (key === 'getParameter') return () => 'Test graphics card';
          if (key === 'getProgramParameter') return () => true;
          if (key === 'isContextLost') return () => false;
          if (key === 'getExtension') return () => null;
          // Constants (VERTEX_SHADER, …) are numbers; every other call succeeds quietly.
          return typeof key === 'string' && key === key.toUpperCase() ? 1 : () => ({});
        },
      },
    );
    HTMLCanvasElement.prototype.getContext = (() =>
      card) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/');
  const draws = () => page.evaluate(() => (window as unknown as { draws: number }).draws);
  const drawnIn = async (ms: number) => {
    const before = await draws();
    await page.waitForTimeout(ms);
    return (await draws()) - before;
  };
  await expect.poll(() => drawnIn(200)).toBeGreaterThan(0);
  await page.locator('#about').getByRole('link', { name: 'View CV' }).click();
  const cv = page.getByRole('dialog', { name: profileValue('name') });
  await expect(cv).toBeVisible();
  await expect.poll(() => drawnIn(200)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(cv).toBeHidden();
  await expect.poll(() => drawnIn(200)).toBeGreaterThan(0);
});

// The top bar's clock keeps London time to the minute, and only touches the page when the minute
// changes (it once rewrote itself every second).
test('the clock changes on the minute, and is left alone in between', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-28T13:00:00Z') }); // 14:00 in London
  await page.setViewportSize({ width: 1280, height: 800 });
  // A page with little else on it: the home page's animations make the stand-in time crawl.
  await page.goto('/privacy');
  // From here the test alone moves the time on.
  await page.clock.pauseAt(new Date('2026-09-28T13:00:30Z'));
  const clock = page.locator('.top-bar live-clock');
  await expect(clock).toHaveText('14:00');
  await clock.evaluate((element) => {
    const counter = window as unknown as { writes: number };
    counter.writes = 0;
    new MutationObserver((records) => (counter.writes += records.length)).observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  const writes = () => page.evaluate(() => (window as unknown as { writes: number }).writes);
  await page.clock.runFor(20_000);
  await expect(clock).toHaveText('14:00');
  expect(await writes()).toBe(0);
  await page.clock.runFor(15_000);
  await expect(clock).toHaveText('14:01');
  await page.clock.runFor(60_000);
  await expect(clock).toHaveText('14:02');
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

// The menu is the navigation on every screen: seven links in a row across the bar were a lot to take
// in, so the bar keeps the clock, the weather and one button, on a computer as on a phone.
for (const viewport of [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
]) {
  test(`the menu opens the navigation and closes when a link is followed (${viewport.width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    // No row of links in the bar itself: the only navigation is the menu's.
    await expect(page.locator('.top-bar nav')).toHaveCount(1);
    const menu = page.locator('.top-bar details');
    const panel = menu.getByRole('navigation', { name: 'Main' });
    await expect(panel).toBeHidden();
    await menu.locator('summary').click();
    await expect(panel.getByRole('link', { name: 'Work' })).toBeVisible();
    // The panel hangs from the bar, as wide as the bar, inside the window.
    const bar = await page.locator('.top-bar').boundingBox();
    const box = await menu.locator('.panel').boundingBox();
    expect(box?.x).toBeCloseTo(bar?.x ?? -1, 0);
    expect(box?.width).toBeCloseTo(bar?.width ?? -1, 0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
    await panel.getByRole('link', { name: 'Work' }).click();
    await expect(menu).not.toHaveAttribute('open');
    await expect(page).toHaveURL(/#work$/);
  });
}

// The menu drops from the bar with the call as its last link, in blue and in the same large
// type as the rest; Escape or a tap outside it closes it.
test('the menu offers the call, and closes on Escape or a tap outside it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const menu = page.locator('.top-bar details');
  await menu.locator('summary').click();
  const links = menu.getByRole('navigation', { name: 'Main' }).getByRole('link');
  const call = links.last();
  await expect(call).toHaveText('Book a call');
  await expect(call).toHaveAttribute('href', '/#contact');
  await expect(call).toHaveCSS('color', 'rgb(38, 97, 186)');
  await expect(call).toHaveCSS(
    'font-size',
    await links.first().evaluate((a) => getComputedStyle(a).fontSize),
  );
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open');
  await expect(menu.locator('summary')).toBeFocused();
  await menu.locator('summary').click();
  // Tapping inside the panel, away from its links, leaves it open.
  const inside = await menu.locator('.panel').boundingBox();
  await page.mouse.click((inside?.x ?? 0) + 8, (inside?.y ?? 0) + (inside?.height ?? 0) - 8);
  await expect(menu).toHaveAttribute('open');
  // Below the panel, on the page.
  const panel = await menu.locator('.panel').boundingBox();
  await page.mouse.click(20, (panel?.y ?? 0) + (panel?.height ?? 0) + 40);
  await expect(menu).not.toHaveAttribute('open');
});

// On a short screen (a phone on its side) the open menu scrolls within itself, so its last links
// stay reachable: the bar is sticky, so the page's own scroll can't bring them into view.
test('on a short screen the open menu scrolls to its last link', async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 });
  await page.goto('/');
  const menu = page.locator('.top-bar details');
  await menu.locator('summary').click();
  const last = menu.locator('.socials a').last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport({ ratio: 1 });
  const panel = await menu.locator('.panel').boundingBox();
  expect((panel?.y ?? 0) + (panel?.height ?? 0)).toBeLessThanOrEqual(375);
});

// Tabbing on past the menu's last link closes it, so focus never lands on the page hidden under it.
test('tabbing out of the menu closes it', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari tabs only to form controls by default');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const menu = page.locator('.top-bar details');
  await menu.locator('summary').click();
  await menu.locator('.socials a').last().focus();
  await page.keyboard.press('Tab');
  await expect(menu).not.toHaveAttribute('open');
});

// The menu leads its icons with the CV, which opens over the home page.
test('the menu offers the CV beside the social links', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const menu = page.locator('.top-bar details');
  await menu.locator('summary').click();
  const icons = menu.locator('.socials a');
  await expect(icons.first()).toHaveAccessibleName('View CV');
  await expect(icons).toHaveCount(5);
  await icons.first().click();
  await expect(menu).not.toHaveAttribute('open');
  const cv = page.getByRole('dialog', { name: profileValue('name') });
  await expect(cv).toBeVisible();
  // Closed, the CV hands focus back to the menu button, not to the link hidden in the closed menu.
  await page.keyboard.press('Escape');
  await expect(cv).toBeHidden();
  await expect(menu.locator('summary')).toBeFocused();
});

for (const path of ['/projects', '/work/amniki']) {
  test(`${path} has a Back to home shortcut`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('main').getByRole('link', { name: 'Back to home' }).click();
    await expect(page.locator('#top .headline')).toBeVisible();
  });
}

test('Home in the menu leads back to the home page from All work', async ({ page }) => {
  await page.goto('/projects');
  await page.locator('.top-bar summary').click();
  await page.locator('.top-bar .panel-links').getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/#home$/);
  await expect(page.locator('#top .headline')).toBeVisible();
});

test('the menu links to each part of the home page, in order, then the call', async ({ page }) => {
  await page.goto('/projects');
  await page.locator('.top-bar summary').click();
  await expect(page.locator('.top-bar .panel-links a')).toHaveText([
    'Home',
    'About',
    'Work',
    'Toolkit',
    'Ask',
    sectionHeading('testimonials'),
    'Contact',
    'Book a call',
  ]);
  const links = page.locator('.top-bar .panel-links');
  await expect(links.getByRole('link', { name: 'Ask' })).toHaveAttribute('href', '/#interview');
  // The recommendations, under their section's heading, while there is one to show.
  await expect(links.getByRole('link', { name: sectionHeading('testimonials') })).toHaveAttribute(
    'href',
    '/#testimonials',
  );
});

// The bar shows London's weather as an icon and the temperature; the word for it stays for screen
// readers. (Every test gets a fixed reading in place of Open-Meteo's, so it always shows here.)
test('the weather shows as an icon and a temperature, its word kept for screen readers', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const weather = page.locator('.top-bar .weather');
  await expect(weather).toBeVisible();
  await expect(weather.locator('[data-temp]')).toHaveText('18');
  await expect(weather.locator('use')).toHaveAttribute('href', '#weather-cloud');
  const icon = await weather.locator('svg').boundingBox();
  expect(icon?.width).toBe(16);
  const word = weather.locator('.condition');
  await expect(word).toHaveText(/\S/);
  const box = await word.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(1);
});

// Scrolled, the bar floats as a pill with rounded corners. The page-coloured strip behind it then
// reaches a little below it, so whatever scrolls underneath ends in a straight line clear of the bar:
// before, slivers of the page showed in the notches around its lower corners.
test('the floating bar keeps a clear band beneath it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const timelines = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
  test.skip(!timelines, 'Without scroll timelines the bar keeps its square corners');
  // Whether the bar (its strip) is what sits just under its own lower-left corner.
  const clear = () =>
    page.evaluate(() => {
      const bar = document.querySelector('.top-bar');
      const box = bar?.getBoundingClientRect();
      if (!bar || !box) return null;
      return bar.contains(document.elementFromPoint(box.left + 4, box.bottom + 4));
    });
  // At the top of the page the bar is the top of the hero's frame, and joins it.
  expect(await clear()).toBe(false);
  await page.evaluate(() => scrollTo(0, 400));
  await expect.poll(clear).toBe(true);
});

// The bar holds three things on every screen, clear of one another: the clock, the weather beside
// it, and the menu button at the right.
for (const width of [320, 770, 1280]) {
  test(`at ${width}px the top bar holds the clock, the weather and the menu button`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(page.locator('.top-bar .weather')).toBeVisible();
    const bar = await page.locator('.top-bar').boundingBox();
    const clock = await page.locator('.top-bar live-clock').boundingBox();
    const weather = await page.locator('.top-bar .where').boundingBox();
    const button = await page.locator('.top-bar summary').boundingBox();
    if (!bar || !clock || !weather || !button) throw new Error('top bar not laid out');
    expect(clock.x + clock.width).toBeLessThanOrEqual(weather.x);
    expect(weather.x + weather.width).toBeLessThanOrEqual(button.x);
    expect(button.x + button.width).toBeLessThanOrEqual(bar.x + bar.width);
    // The button is a comfortable target, at the bar's right edge.
    expect(button.width).toBeGreaterThanOrEqual(40);
    expect(bar.x + bar.width - (button.x + button.width)).toBeLessThanOrEqual(16);
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

// The pill says the same whole line on every screen, and nothing in it moves.
test('the availability pill says the whole line, still, even on the smallest phone', async ({
  page,
}) => {
  const line = profileValue('availability');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  const pill = page.locator('.hero .availability');
  await expect(pill).toHaveText(line);
  await expect(pill.locator('role-rotator')).toHaveCount(0);
  await expect(pill.locator('.available-dot')).toHaveCSS('animation-name', 'none');
  const box = await pill.boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
});

// The hero's workflow line-art runs over the sky on wider screens, a light travelling slowly along
// each line (a nine-second loop); phones keep the sky alone.
test('the hero line-art shows on desktop, its light slow, and rests on phones', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.hero .flow')).toBeVisible();
  const light = page.locator('.hero .flow .pulse').first();
  await expect(light).toHaveCSS('animation-name', 'flow-pulse');
  await expect(light).toHaveCSS('animation-duration', '9s');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('.hero .flow')).toBeHidden();
  await expect(page.locator('.hero .band-socials')).toBeVisible();
});

// The About card's typical day ticks itself off on London time: a task is ticked the moment its
// time comes, the one under way included, and the rest are still to come. (The scrolling list is drawn twice; screen readers
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
  // Ticked as its time comes: the count takes in the task under way, which wears a tick in the
  // accent blue where the earlier ones are navy.
  const started = tasks.filter(([time]) => (time ?? '') <= '14:00').length;
  expect(started).toBeGreaterThan(0);
  await expect(day.locator('[data-done-count]')).toHaveText(String(started));
  await expect(day.locator('li:not([aria-hidden])[data-state="now"] .rem-tick')).toHaveCSS(
    'background-color',
    'rgb(38, 97, 186)',
  );
  await expect(day).toContainText(/\d+ of \d+ done/);
  await expect(day.getByRole('link', { name: "Let's talk" })).toHaveAttribute('href', '#contact');
});

// The typical day is a watch: its face goes black after dark in London, and the crown switches it.
test('the day watch shows its night face after dark, and the crown switches it', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-09-28T20:30:00Z')); // 21:30 in London
  await page.goto('/');
  const watch = page.locator('.rem-watch');
  const crown = watch.getByRole('button', { name: 'Night face' });
  await expect(watch).toHaveAttribute('data-night', '');
  await expect(crown).toHaveAttribute('aria-pressed', 'true');
  await crown.click();
  await expect(watch).not.toHaveAttribute('data-night');
  await expect(crown).toHaveAttribute('aria-pressed', 'false');
});

test('the day watch shows its day face in the London daytime', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-28T11:00:00Z')); // 12:00 in London
  await page.goto('/');
  await expect(page.locator('.rem-watch')).not.toHaveAttribute('data-night');
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
  await page.goto('/projects');
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

  // Bring every scroll reveal on screen until the reveal observer has seen it (its .in class), then
  // list what the pause holds. Reveals in a hidden tab (the other side of the Work switch) can't
  // scroll into view; skip them. Each wait is on the page's own state, checked frame by frame, not a
  // set number of frames: under a full parallel run WebKit draws only six or seven frames a second.
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (const element of document.querySelectorAll('[data-reveal]')) {
      if (element.getClientRects().length === 0) continue;
      element.scrollIntoView({ block: 'center' });
      while (!element.classList.contains('in')) await frame();
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

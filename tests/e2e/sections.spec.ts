import { expect, test, type Locator, type Page } from '../support/test.ts';
import { ICONS } from '../../src/lib/icons.ts';
import { profileParagraph, sectionHeading, yamlList, yamlValues } from '../support/content.ts';
import { scrollIntoViewSettled } from '../support/settle.ts';

// Play my intro shows only once the owner's recording is in the profile.
const INTRO = yamlValues('src/content/profile.yaml', 'voiceIntro').length > 0;

// Long sections can be collapsed with a round toggle (named after the section, announcing whether
// it's expanded).
test('Selected work starts open and can be hidden', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: sectionHeading('work'), exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  // It slides open as it scrolls into view (below).
  await scrollIntoViewSettled(page.locator('#work'));
  await expect(page.locator('#work-body')).toBeVisible();
  await toggle.click();
  await expect(page.locator('#work-body')).toBeHidden();
  // The Work / Personal projects switch hides with the section.
  await expect(page.locator('#work fieldset')).toBeHidden();
});

// Every toggle is a plain chevron: up while its section is open, down while it's collapsed.
test('each section toggle is a chevron', async ({ page }) => {
  await page.goto('/');
  // Work, the Toolkit, Ask me and Feedback (which shows once it has a real testimonial).
  const toggles = page.locator('.stack .collapse');
  await expect(toggles.first()).toBeVisible();
  expect(await toggles.count()).toBeGreaterThanOrEqual(3);
  const shape = (name: 'chevron-up' | 'chevron-down') => /d="([^"]+)"/.exec(ICONS[name])?.[1];
  // The shape each toggle shows, whichever of its two icons is displayed.
  const shown = async () =>
    new Set(
      await toggles.evaluateAll((buttons) =>
        buttons.map((button) =>
          [...button.querySelectorAll('svg')]
            .find((svg) => getComputedStyle(svg).display !== 'none')
            ?.querySelector('path')
            ?.getAttribute('d'),
        ),
      ),
    );
  expect(await shown()).toEqual(new Set([shape('chevron-up')]));
  // Each heading rises into place as it scrolls into view, so each click waits for it to settle.
  for (const toggle of await toggles.all()) {
    await scrollIntoViewSettled(toggle);
    await toggle.click();
  }
  // Under load a click's effect can land a moment after the click returns.
  await expect.poll(shown).toEqual(new Set([shape('chevron-down')]));
});

// Collapsed, a section is a bar with its title and intro centred top to bottom, not sitting low.
for (const viewport of [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
]) {
  test(`a collapsed section's title sits centred in its bar (${viewport.width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const section = page.locator('#skills');
    await scrollIntoViewSettled(section);
    // Under a full parallel run WebKit now and then lands the click while the page is still
    // shifting, and the section stays open: click until it has closed.
    const toggle = page.getByRole('button', { name: sectionHeading('skills'), exact: true });
    await expect(async () => {
      if (await page.locator('#skills-body').isVisible()) await toggle.click();
      await expect(page.locator('#skills-body')).toBeHidden({ timeout: 1500 });
    }).toPass();
    const gaps = await section.evaluate((shell) => {
      const bar = shell.getBoundingClientRect();
      const title = shell.querySelector('.section-title')?.getBoundingClientRect();
      return title ? { above: title.top - bar.top, below: bar.bottom - title.bottom } : null;
    });
    expect(Math.abs((gaps?.above ?? 0) - (gaps?.below ?? 100))).toBeLessThanOrEqual(1);
  });
}

test('clicking a collapsible section title toggles it too', async ({ page }) => {
  await page.goto('/');
  const body = page.locator('#skills-body');
  await scrollIntoViewSettled(page.locator('#skills'));
  // Under a full parallel run WebKit now and then drops a click that lands mid-layout, so each
  // click is repeated until it has taken.
  await expect(async () => {
    if (await body.isVisible()) await page.locator('#skills .section-title').click();
    await expect(body).toBeHidden({ timeout: 1000 });
  }).toPass();
  await expect(async () => {
    if (await body.isHidden()) await page.locator('#skills h2').click();
    await expect(body).toBeVisible({ timeout: 1000 });
  }).toPass();
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

// Every section is open from the start: nothing slides open as the page scrolls, so what's below
// never moves while the visitor reads (the chevrons still hide a section by hand).
test('every section is open from the start, and none slides', async ({ page }) => {
  await page.goto('/');
  expect((await page.locator('#skills-body').boundingBox())?.height).toBeGreaterThan(100);
  expect((await page.locator('#interview-body').boundingBox())?.height ?? 0).toBeGreaterThan(100);
  await expect(page.locator('#skills-body')).toHaveCSS('transition-duration', '0s');
});

// A jump to a section lands on it, heading in view and clear of the sticky top bar. (Sections once
// opened as the page scrolled past them, which pushed the one jumped to out of sight.)
async function landsOn(section: Locator): Promise<void> {
  const page = section.page();
  const head = section.locator('.section-head');
  // The smooth scroll is over once the page holds still for a third of a second.
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        let last = -1;
        let since = 0;
        const check = (now: number) => {
          if (window.scrollY !== last) [last, since] = [window.scrollY, now];
          if (now - since > 330) resolve(true);
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
  );
  await expect(head).toBeInViewport({ ratio: 1 });
  // Clear of the sticky top bar, not tucked beneath it.
  const bar = await page.locator('.top-bar').boundingBox();
  const box = await head.boundingBox();
  expect(box?.y ?? 0).toBeGreaterThanOrEqual((bar?.y ?? 0) + (bar?.height ?? 0));
}

// The hero's content rises into place as the page loads. Clicked while it still moves, Playwright
// retries, and each retry first scrolls the link into view; the page scrolls smoothly, so the press
// and the release land on different elements and the click never reaches the link (Firefox on CI,
// seen in a diagnostic run). So the test waits for the hero to settle, as a visitor's eye does.
test("the hero's Book a call lands on Let's work together", async ({ page }) => {
  await page.goto('/');
  const call = page.locator('#top').getByRole('link', { name: 'Book a call' });
  await scrollIntoViewSettled(call);
  await call.click();
  await landsOn(page.locator('#contact'));
});

test('a link in the menu lands on its section', async ({ page }) => {
  await page.goto('/');
  await page.locator('.top-bar summary').click();
  await page.locator('.top-bar .panel-links').getByRole('link', { name: 'Toolkit' }).click();
  await landsOn(page.locator('#skills'));
});

test("arriving from another page at a section's address lands on it", async ({ page }) => {
  await page.goto('/#interview');
  await landsOn(page.locator('#interview'));
});

// A visitor who paused animations finds the next page paused from its first frame: the class is on
// the page once the document is read, before any deferred script runs.
test('paused animations stay paused from the first frame of the next page', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('motion', 'paused');
    document.addEventListener('readystatechange', () => {
      if (document.readyState !== 'interactive') return;
      document.documentElement.dataset['pausedOnRead'] = String(
        document.documentElement.classList.contains('motion-paused'),
      );
    });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-paused-on-read', 'true');
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
    const gap = work.getBoundingClientRect().top - about.getBoundingClientRect().bottom;
    return {
      // Firefox lands the two edges a hair apart (0.00006px) from layout rounding.
      gap: Math.round(Math.abs(gap) * 100) / 100,
      aboutFoot: getComputedStyle(about).borderEndStartRadius,
      workHead: getComputedStyle(work).borderStartStartRadius,
    };
  });
  expect(edges).toEqual({ gap: 0, aboutFoot: '0px', workHead: '0px' });
});

// The back-to-top button is a small watch, like the top-bar clock: black glass with a sheen in its
// brushed-metal rim, a white arrow, and a blue ring that fills as the page scrolls.
test('the back-to-top button is a watch face', async ({ page }) => {
  await page.goto('/');
  const button = page.locator('.to-top');
  await expect(button).toHaveCSS('border-top-width', '3px');
  await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
  // The sheen, the black glass and the metal rim.
  const layers = await button.evaluate(
    (element) => getComputedStyle(element).backgroundImage.split('linear-gradient').length - 1,
  );
  expect(layers).toBe(3);
  await expect(page.locator('.to-top .done')).toHaveCSS('stroke', 'rgb(128, 179, 255)');
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

// The statement reads in full colour, still: text doesn't change while it's being read.
test('the About statement reads in full colour and holds still', async ({ page }) => {
  await page.goto('/');
  const statement = page.locator('#about .statement');
  await expect(statement).toHaveText(profileParagraph('about'));
  await expect(statement).toHaveCSS('color', 'rgb(10, 10, 10)');
  await expect(statement).toHaveCSS('animation-name', 'none');
  await expect(statement.locator('span')).toHaveCount(0);
});

// Pausing straight after play cancels the play request, which isn't the audio failing.
test('Play my intro, paused straight away, never says the audio is unavailable', async ({
  page,
}) => {
  test.skip(!INTRO, 'No voice intro is recorded yet');
  await page.goto('/');
  const button = page.locator('#about voice-intro button');
  await scrollIntoViewSettled(button);
  // Both presses in one go, so the pause lands before the play request settles.
  await button.evaluate((element: HTMLButtonElement) => {
    element.click();
    element.click();
  });
  await page.waitForTimeout(500);
  await expect(button.locator('[data-label]')).toHaveText('Play my intro');
});

// Play my intro and View CV sit on one line: their icons share a centre.
test('the About row lines up Play my intro with View CV', async ({ page }) => {
  test.skip(!INTRO, 'No voice intro is recorded yet');
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

// Feedback (what people say) is a calm call in a window like the Toolkit's: its bar across the top, a seat for
// each person and one for the owner, listening, and beneath them the words of whoever is speaking.
// It works the same on a phone and a computer: picking a seat shows that person's words.
for (const viewport of [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
]) {
  test(`Feedback seats each person and shows the words of the one picked (${viewport.width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const section = page.locator('#testimonials');
    await scrollIntoViewSettled(section);
    // The window's bar holds only its buttons: no title beside the section's own heading.
    await expect(section.locator('.window-bar')).toBeVisible();
    await expect(section.locator('.window-bar .name')).toHaveCount(0);
    const names = await section.locator('.words b').allTextContents();
    const seats = section.locator('label.seat input');
    await expect(seats).toHaveCount(names.length);
    // Each seat is a radio named for its person.
    await expect(section.getByRole('radio')).toHaveCount(names.length);
    await expect(seats.first()).toHaveAccessibleName(names[0] ?? '');
    // The owner has a seat too, listening: it isn't one to pick.
    await expect(section.locator('.seat.me')).toBeVisible();
    await expect(section.locator('.seat.me input')).toHaveCount(0);
    // The first person speaks first; only their words show. (Lists, since for a moment, as one
    // person's words fade out and the next one's in, both are on screen.)
    const speaking = section.locator('.words:visible');
    await expect(speaking.locator('b')).toHaveText([names[0] ?? '']);
    await expect(seats.first()).toBeChecked();
    test.skip(names.length < 2, 'A single testimonial leaves no one else to pick');
    await section.locator('label.seat').nth(1).click();
    await expect(seats.nth(1)).toBeChecked();
    await expect(speaking.locator('b')).toHaveText([names[1] ?? '']);
    // Every recommendation says where it was given.
    await expect(speaking.locator('.source')).toHaveText(['LinkedIn']);
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(sideways).toBeLessThanOrEqual(0);
  });
}

// Its close and minimise buttons put the window away: the section collapses, as its own toggle does,
// and focus goes to that toggle, which opens it again.
for (const name of ['Close', 'Minimise'].map(
  (verb) => `${verb} ${sectionHeading('testimonials')}`,
)) {
  test(`"${name}" collapses the section`, async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#testimonials');
    await scrollIntoViewSettled(section);
    await section.getByRole('button', { name }).click();
    await expect(page.locator('#testimonials-body')).toBeHidden();
    const toggle = section.locator('.collapse');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.locator('#testimonials-body')).toBeVisible();
  });
}

// One look for every small icon on the site: View CV in About sits on the same white tile as the
// social links in Let's work together (as does Play my intro, once recorded), its words beside it.
test('View CV in About wears the same icon tile as the social links', async ({ page }) => {
  await page.goto('/');
  const look = (tile: Locator) =>
    tile.evaluate((element) => {
      const style = getComputedStyle(element);
      return [
        style.width,
        style.height,
        style.borderRadius,
        style.backgroundColor,
        style.boxShadow,
        style.color,
      ].join(' | ');
    });
  const cv = page.locator('#about').getByRole('link', { name: 'View CV' });
  await expect(cv).toHaveText('View CV');
  const tile = cv.locator('.icon-tile');
  await expect(tile.locator('svg')).toHaveCount(1);
  expect(await look(tile)).toBe(await look(page.locator('#contact .socials a').last()));
  expect(await look(tile)).toBe(await look(page.locator('.hero .band-socials a').first()));
});

// The About stats: one band of the live Blue sky, each number centred over its label, from the profile.
test('the About stats sit on one band of the live sky', async ({ page }) => {
  await page.goto('/');
  const stats = page.locator('#about .stats');
  await expect(stats.locator('sky-gradient')).toHaveCount(1);
  await expect(stats.locator('.stat-num')).toHaveText(
    yamlValues('src/content/profile.yaml', 'value'),
  );
  // White on the sky, over a soft blue wash and with a shadow (the owner's choice), centred in its
  // place; the typical day's header stays navy until its night face turns it white.
  const label = stats.locator('.stat-label').first();
  await expect(label).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(label).toHaveCSS('text-shadow', /rgba\(12, 36, 84/);
  await expect(stats.locator('.cells li').first()).toHaveCSS('text-align', 'center');
  const night = await page.locator('#about .rem-watch').getAttribute('data-night');
  await expect(page.locator('#about .rem-app')).toHaveCSS(
    'color',
    night === null ? 'rgb(12, 36, 84)' : 'rgb(255, 255, 255)',
  );
});

// The Toolkit (the Skills section): the tools as app icons, the skills as a list and the
// certifications as credential cards, straight from skills.yaml, one group at a time.
const SKILLS = 'src/content/skills.yaml';
// One group shows at a time; the others fade out but stay readable to screen readers, so what
// counts is each group's opacity.
const shown = (page: Page, group: string) => () =>
  page
    .locator(`#skills .panel[data-panel="${group}"]`)
    .evaluate((panel) => getComputedStyle(panel).visibility);

// Tools: a Windows taskbar under a patch of the live sky, each pinned tool's name always there to
// read, under its icon. The pinned tools and the tray's arrow sit in one row on a computer.
test('the tools sit on a Windows taskbar, their names beneath them, lighting up when pointed at', async ({
  page,
}) => {
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit);
  await expect(toolkit.locator('.desk sky-gradient')).toHaveCount(1);
  const taskbar = toolkit.locator('.taskbar');
  // The Start button leads the bar, for the look only.
  await expect(taskbar.locator('.start')).toHaveAttribute('aria-hidden', 'true');
  const tool = taskbar.locator(':scope > .tool').nth(2);
  await expect(tool.locator('.tool-name')).toBeVisible();
  const icon = await tool.locator('.tool-icon').boundingBox();
  const name = await tool.locator('.tool-name').boundingBox();
  expect(name?.y ?? 0).toBeGreaterThanOrEqual((icon?.y ?? 0) + (icon?.height ?? 0) - 1);
  const tops = await taskbar
    .locator(':scope > .tool .tool-icon, summary .tool-icon')
    .evaluateAll((icons) => icons.map((one) => Math.round(one.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  // Every button is the same width, the Start button's included, so the icons are evenly spaced.
  const centres = await taskbar.locator(':scope > li').evaluateAll((all) =>
    all.map((one) => {
      const box = one.getBoundingClientRect();
      return box.left + box.width / 2;
    }),
  );
  const steps = centres.slice(1).map((centre, index) => centre - (centres[index] ?? 0));
  expect(Math.max(...steps) - Math.min(...steps)).toBeLessThanOrEqual(1);
  // No two names touch: each tool's name keeps clear of the next one's.
  const names = await taskbar
    .locator(':scope > .tool .tool-name')
    .evaluateAll((all) => all.map((one) => one.getBoundingClientRect()));
  for (const [index, box] of names.slice(1).entries()) {
    expect(box.left - (names[index]?.right ?? 0)).toBeGreaterThanOrEqual(8);
  }
  // Nothing spills out of the bar.
  const spill = await taskbar.evaluate((bar) => bar.scrollWidth - bar.clientWidth);
  expect(spill).toBeLessThanOrEqual(0);
  await scrollIntoViewSettled(tool);
  await tool.hover();
  await expect(tool).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.7)');
});

// Five tools are pinned to the bar; the rest wait in a tray, as Windows keeps its hidden icons. The
// arrow at the end of the bar opens it over the sky, above the bar and inside the card, and closes it.
for (const viewport of [
  { width: 320, height: 800 },
  { width: 1280, height: 800 },
]) {
  test(`the taskbar's arrow opens a tray with the other tools (${viewport.width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const toolkit = page.locator('#skills');
    await scrollIntoViewSettled(toolkit.locator('.taskbar'));
    // Five on the bar; between the bar and the tray, every tool once.
    const pinned = await toolkit.locator('.taskbar > .tool .tool-name').allTextContents();
    expect(pinned).toHaveLength(5);
    const arrow = toolkit.locator('.taskbar summary');
    await expect(arrow).toHaveAccessibleName('More tools');
    const tray = toolkit.locator('.tray');
    await expect(tray).toBeHidden();
    await arrow.click();
    await expect(tray).toBeVisible();
    const inTray = await tray.locator('.tool-name').allTextContents();
    expect([...pinned, ...inTray].sort()).toEqual(yamlValues(SKILLS, 'name').sort());
    const card = await toolkit.locator('.toolkit').boundingBox();
    const box = await tray.boundingBox();
    const bar = await toolkit.locator('.taskbar').boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(card?.x ?? 0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
      (card?.x ?? 0) + (card?.width ?? 0),
    );
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(bar?.y ?? 0);
    expect(box?.y ?? -1).toBeGreaterThanOrEqual(card?.y ?? 0);
    // No name spills out of its place in the tray.
    const spills = await tray
      .locator('.tool-name')
      .evaluateAll((all) => all.filter((one) => one.scrollWidth > one.clientWidth).length);
    expect(spills).toBe(0);
    await arrow.click();
    await expect(tray).toBeHidden();
  });
}

// Like Windows' own, the tray closes on Escape, handing focus back to its arrow, or on a click
// anywhere else.
test('the tray closes on Escape or a click elsewhere', async ({ page }) => {
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit.locator('.taskbar'));
  const arrow = toolkit.locator('.taskbar summary');
  const tray = toolkit.locator('.tray');
  await arrow.click();
  await expect(tray).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tray).toBeHidden();
  await expect(arrow).toBeFocused();
  await arrow.click();
  await expect(tray).toBeVisible();
  // In the page's margin, clear of every control.
  await page.mouse.click(4, 300);
  await expect(tray).toBeHidden();
});

test.describe('the tools on a touch screen', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox has no mobile emulation');
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  // On a phone the bar keeps to one row, as a real taskbar does: the Start button and the icons
  // alone, close together, each tool's name still there for screen readers, and nothing moves.
  test('sit in one row, icons only, and nothing moves', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('#skills .taskbar');
    await scrollIntoViewSettled(bar);
    const tool = bar.locator(':scope > .tool').first();
    await expect(bar.locator('.start')).toBeVisible();
    await expect(tool.locator('.tool-name')).toHaveText(/\S/);
    const name = await tool.locator('.tool-name').boundingBox();
    expect(name?.width ?? 99).toBeLessThanOrEqual(1);
    const tops = await bar
      .locator(':scope > li')
      .evaluateAll((all) => all.map((one) => Math.round(one.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    // None is cut off at the bar's ends.
    const box = await bar.boundingBox();
    for (const one of await bar.locator(':scope > .tool, summary').all()) {
      const at = await one.boundingBox();
      expect(at?.x ?? -1).toBeGreaterThanOrEqual((box?.x ?? 0) - 0.5);
      expect((at?.x ?? 0) + (at?.width ?? 0)).toBeLessThanOrEqual(
        (box?.x ?? 0) + (box?.width ?? 0) + 0.5,
      );
    }
    await expect(tool.locator('.tool-icon')).toHaveCSS('animation-name', 'none');
  });
});

// A long folder name (AI Capabilities, on a phone) takes two lines; every name has room for two,
// so each issuer sits level with the one beside it.
// On a phone the tools are only as tall as they need (their sky isn't stretched to the slide deck's
// height, yet the tray still opens inside the card); the skills and certifications share one height.
test('on a phone the tools take only the height they need', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit);
  const height = () =>
    toolkit.locator('.toolkit').evaluate((card) => card.getBoundingClientRect().height);
  const tools = await height();
  await toolkit.locator('.switch').getByText('Skills', { exact: true }).click();
  await expect.poll(height).toBeGreaterThan(tools + 100);
  // The skills and the certifications keep one height between them.
  const skills = await height();
  await toolkit.locator('.switch').getByText('Certifications', { exact: true }).click();
  await expect.poll(height).toBe(skills);
  await toolkit.locator('.switch').getByText('Tools', { exact: true }).click();
  await expect.poll(height).toBe(tools);
  await toolkit.locator('.taskbar summary').click();
  const tray = await toolkit.locator('.tray').boundingBox();
  const card = await toolkit.locator('.toolkit').boundingBox();
  expect(tray?.y ?? -1).toBeGreaterThanOrEqual(card?.y ?? 0);
});

// On a phone the seats are narrow: the speaking bars sit as a badge on the circle, so a longer name
// (Dianne, Gideon) stays inside its seat when its person speaks.
// On a phone every card's caption is the same two lines: the name with where it was given, then
// the role beneath (a long role once wrapped and pushed LinkedIn on to a line of its own).
test('on a phone every Feedback caption has the same two lines', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const section = page.locator('#testimonials');
  await scrollIntoViewSettled(section);
  const seats = section.locator('label.seat');
  const heights = new Set<number>();
  for (let index = 0; index < (await seats.count()); index++) {
    await seats.nth(index).click();
    const caption = section.locator('.words:visible figcaption');
    await expect(caption).toHaveCount(1);
    const layout = await caption.evaluate((figcaption) => {
      const name = figcaption.querySelector('b')?.getBoundingClientRect();
      const source = figcaption.querySelector('.source')?.getBoundingClientRect();
      return {
        height: Math.round(figcaption.getBoundingClientRect().height),
        level:
          name && source
            ? Math.abs(name.top + name.height / 2 - (source.top + source.height / 2))
            : 99,
      };
    });
    expect(layout.level).toBeLessThanOrEqual(3);
    heights.add(layout.height);
  }
  expect([...heights]).toHaveLength(1);
});

test('on a phone each name stays inside its seat as its person speaks', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const section = page.locator('#testimonials');
  await scrollIntoViewSettled(section);
  const seats = section.locator('label.seat');
  for (let index = 0; index < (await seats.count()); index++) {
    await seats.nth(index).click();
    await expect(section.locator('label.seat input').nth(index)).toBeChecked();
    const inside = await seats.nth(index).evaluate((seat) => {
      const box = seat.getBoundingClientRect();
      return [...seat.querySelectorAll('.seat-name > span')]
        .map((part) => part.getBoundingClientRect())
        .filter((part) => part.width > 1)
        .every((part) => part.left >= box.left - 0.5 && part.right <= box.right + 0.5);
    });
    expect(inside).toBe(true);
  }
});

// Feedback's window is as tall as the words being read: a shorter quote leaves no empty space under
// it, as it once did when every quote kept the longest one's height.
test('the Feedback window fits the words of whoever is speaking', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const section = page.locator('#testimonials');
  await scrollIntoViewSettled(section);
  const below = () =>
    section.evaluate((shell) => {
      const window = shell.querySelector('.window')?.getBoundingClientRect();
      const words = [...shell.querySelectorAll('.words')]
        .find((one) => getComputedStyle(one).display !== 'none')
        ?.getBoundingClientRect();
      return window && words ? Math.round(window.bottom - words.bottom) : -1;
    });
  const seats = section.locator('label.seat');
  const gaps = new Set<number>();
  for (let index = 0; index < (await seats.count()); index++) {
    await seats.nth(index).click();
    await expect(section.locator('label.seat input').nth(index)).toBeChecked();
    gaps.add(await below());
  }
  expect([...gaps]).toHaveLength(1);
});

test('the certification folders keep their issuers level on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit);
  await toolkit.locator('.switch').getByText('Certifications', { exact: true }).click();
  await expect(toolkit.locator('.cert-card').first()).toBeVisible();
  const cards = await toolkit.locator('.cert-card').evaluateAll((all) =>
    all.map((card) => ({
      top: Math.round(card.getBoundingClientRect().top),
      issuer: Math.round(card.querySelector('.issuer')?.getBoundingClientRect().top ?? 0),
    })),
  );
  for (const card of cards) {
    const row = cards.filter((other) => other.top === card.top);
    expect(new Set(row.map((one) => one.issuer)).size).toBe(1);
  }
});

// On a phone the skills deck shows one phase at a time, picked from the slides' thumbnails beneath
// it; the Toolkit's own switch keeps working around it.
test.describe('the skills on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('show one phase at a time, picked from the slides beneath', async ({ page }) => {
    await page.goto('/');
    const toolkit = page.locator('#skills');
    await scrollIntoViewSettled(toolkit);
    await toolkit.locator('.switch').getByText('Skills', { exact: true }).click();
    const [first = '', second = ''] = yamlValues(SKILLS, 'group');
    const phases = toolkit.getByRole('group', { name: 'Phase' });
    await expect(phases.getByRole('radio', { name: first })).toBeChecked();
    const group = (name: string) =>
      toolkit.locator('.skill-group').filter({ has: page.getByRole('heading', { name }) });
    await expect(group(first)).toBeVisible();
    await expect(group(second)).toBeHidden();
    // Under a full WebKit run the first tap can land mid-layout, so it's retried until it takes.
    await expect(async () => {
      await phases.getByText(second, { exact: true }).click();
      await expect(group(second)).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(group(first)).toBeHidden();
    await expect.poll(shown(page, 'skills')).toBe('visible');
  });
});

test('the Toolkit shows each tool, skill and certification', async ({ page }) => {
  await page.goto('/');
  const toolkit = page.getByRole('region', { name: sectionHeading('skills') });
  for (const key of ['name', 'logo', 'title', 'issuer']) {
    expect(yamlValues(SKILLS, key)).not.toEqual([]);
  }
  await expect(toolkit.locator('.tool-name')).toHaveText(yamlValues(SKILLS, 'name'));
  await expect(toolkit.locator('.tool img')).toHaveCount(yamlValues(SKILLS, 'logo').length);
  // Every skill, the CV's included, as a pill on one of the deck's slides.
  await expect(toolkit.locator('.skill-group h4')).toHaveText(yamlValues(SKILLS, 'group'));
  const pills = (await toolkit.locator('.skill').allTextContents()).map((text) => text.trim());
  expect(pills.sort()).toEqual(
    [...yamlList(SKILLS, 'skills'), ...yamlList(SKILLS, 'cvOnly')].sort(),
  );
  // Each certification is a card with its short name and issuer, named in full for screen readers
  // (who reach them, as everyone does, once the certifications are picked).
  await expect(toolkit.locator('.cert-card .name')).toHaveText(yamlValues(SKILLS, 'short'));
  await scrollIntoViewSettled(toolkit);
  await toolkit.locator('.switch').getByText('Certifications', { exact: true }).click();
  await expect(toolkit.locator('.cert-card .issuer')).toHaveText(yamlValues(SKILLS, 'issuer'));
  const issuers = yamlValues(SKILLS, 'issuer');
  for (const [index, title] of yamlValues(SKILLS, 'title').entries()) {
    await expect(
      toolkit.getByRole('button', { name: `View certificate: ${title}, ${issuers[index]}` }),
    ).toHaveCount(1);
  }
});

// A card opens its certificate in a viewer, which slides through the rest (wrapping round) and
// closes with Escape, back on the card.
test('a certification card opens its certificate, and the viewer slides through', async ({
  page,
}) => {
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit);
  await toolkit.locator('.switch').getByText('Certifications', { exact: true }).click();
  await toolkit.locator('.cert-card').nth(1).click();
  const viewer = page.getByRole('dialog', { name: 'Certificates' });
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('.track')).toHaveCSS('scroll-behavior', 'smooth');
  const count = viewer.locator('.count');
  const total = yamlValues(SKILLS, 'title').length;
  await expect(count).toHaveText(`2 of ${total}`);
  await viewer.getByRole('button', { name: 'Next certificate' }).click();
  await expect(count).toHaveText(`3 of ${total}`);
  // On to the last with the arrow key, however many there are, then round to the first.
  for (let at = 4; at <= total; at++) {
    await page.keyboard.press('ArrowRight');
    await expect(count).toHaveText(`${at} of ${total}`);
  }
  await page.keyboard.press('ArrowRight');
  await expect(count).toHaveText(`1 of ${total}`);
  await viewer.getByRole('button', { name: 'Previous certificate' }).click();
  await expect(count).toHaveText(`${total} of ${total}`);
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
});

// The skills and the certifications sit in Windows windows. Their buttons work: closing Skills
// brings up the certifications, closing those goes back to the tools, and minimising either goes
// back to the tools, as a window goes to the taskbar. Maximise is only the look.
test('the Toolkit windows close onto the next group, and minimise to the tools', async ({
  page,
}) => {
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit);
  const pick = (group: string) => toolkit.locator('.switch').getByText(group, { exact: true });
  const tab = (group: string) => toolkit.locator(`input[value="${group}"]`);
  const bar = (group: string) => toolkit.locator(`.panel[data-panel="${group}"] .window-bar`);

  await pick('Skills').click();
  await expect(bar('skills').locator('span[aria-hidden="true"]')).toHaveCount(1);
  await bar('skills').getByRole('button', { name: 'Close Skills and show Certifications' }).click();
  await expect(tab('certifications')).toBeChecked();
  await expect.poll(shown(page, 'certifications')).toBe('visible');
  await bar('certifications')
    .getByRole('button', { name: 'Close Certifications and go back to Tools' })
    .click();
  await expect(tab('tools')).toBeChecked();
  await expect.poll(shown(page, 'tools')).toBe('visible');

  await pick('Skills').click();
  await bar('skills').getByRole('button', { name: 'Minimise Skills and go back to Tools' }).click();
  await expect(tab('tools')).toBeChecked();
  await expect(tab('tools')).toBeFocused();
});

// On a computer, Skills is a slide deck: the phases are the slides down the side, and the one
// picked fills the canvas, its place in the deck above its heading.
test('the skills are a slide deck, its slides the phases', async ({ page }) => {
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit);
  await toolkit.locator('.switch').getByText('Skills', { exact: true }).click();
  const [first = '', second = ''] = yamlValues(SKILLS, 'group');
  const phases = toolkit.getByRole('group', { name: 'Phase' });
  await expect(phases).toBeVisible();
  const slide = (name: string) =>
    toolkit.locator('.skill-group').filter({ has: page.getByRole('heading', { name }) });
  await expect(slide(first)).toBeVisible();
  await expect(slide(first).locator('.slide-count')).toHaveText(/^1 of \d$/);
  // A finished slide: a line saying what the phase is about, and a footer along its foot with the
  // slide's place in the deck.
  await expect(slide(first).locator('.lead')).toHaveText(yamlValues(SKILLS, 'lead')[0] ?? '');
  const edges = await slide(first).evaluate((element) => {
    const foot = element.querySelector('.slide-foot')?.getBoundingClientRect();
    const pills = element.querySelector('.pills')?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return foot && pills ? { gap: box.bottom - foot.bottom, below: foot.top - pills.bottom } : null;
  });
  expect(edges?.gap).toBeLessThanOrEqual(28);
  expect(edges?.below).toBeGreaterThanOrEqual(0);
  // A whole window around the slides: the file's name in the title bar, a ribbon of tabs under it
  // and a status bar along the foot, each reaching the window's edges. The ribbon and status bar are
  // only the look, so they're kept from assistive technology.
  const panel = toolkit.locator('.panel[data-panel="skills"]');
  await expect(panel.locator('.window-bar .name')).toHaveText('Skills.pptx');
  await expect(panel.locator('.status')).toContainText(
    `${yamlValues(SKILLS, 'group').length} slides`,
  );
  const frame = await panel.boundingBox();
  for (const part of ['.ribbon', '.status']) {
    await expect(panel.locator(part)).toHaveAttribute('aria-hidden', 'true');
    const box = await panel.locator(part).boundingBox();
    expect(box?.x).toBeCloseTo(frame?.x ?? -1, 0);
    expect(box?.width).toBeCloseTo(frame?.width ?? -1, 0);
  }
  const foot = await panel.locator('.status').boundingBox();
  expect((foot?.y ?? 0) + (foot?.height ?? 0)).toBeCloseTo(
    (frame?.y ?? 0) + (frame?.height ?? 0),
    0,
  );
  await expect(slide(second)).toBeHidden();
  await phases.getByText(second, { exact: true }).click();
  await expect(slide(second)).toBeVisible();
  await expect(slide(first)).toBeHidden();
  await expect(phases.locator('input:checked ~ .thumb')).toHaveCSS(
    'border-top-color',
    'rgb(196, 62, 28)',
  );
});

// On a computer, pointing at a folder tips its front forward and a certificate rises out of it.
test('hovering a certification folder tips it open', async ({ page }) => {
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit);
  await toolkit.locator('.switch').getByText('Certifications', { exact: true }).click();
  const card = toolkit.locator('.cert-card').first();
  await scrollIntoViewSettled(card);
  const front = card.locator('.folder-front');
  const tipped = () => front.evaluate((element) => getComputedStyle(element).transform);
  expect(await tipped()).toBe('none');
  await card.hover();
  await expect.poll(tipped).toMatch(/^matrix3d/);
});

// Only the picked group is there to reach: the ones out of sight are hidden, so Tab can't land in
// them (and bounce the Toolkit back to them); the switch is the way to another group.
test('the Toolkit groups out of sight cannot take focus', async ({ page }) => {
  await page.goto('/');
  await scrollIntoViewSettled(page.locator('#skills'));
  const focusable = await page
    .locator('#skills .cert-card')
    .first()
    .evaluate((card: HTMLElement) => {
      card.focus();
      return document.activeElement === card;
    });
  expect(focusable).toBe(false);
  expect(await shown(page, 'certifications')()).toBe('hidden');
});

// The Toolkit opens on the tools and stays there until the visitor picks another group: nothing
// turns on its own.
test('the Toolkit opens on the tools and holds still until another group is picked', async ({
  page,
}) => {
  await page.goto('/');
  await scrollIntoViewSettled(page.locator('#skills'));
  await expect(page.locator('#skills input[value="tools"]')).toBeChecked();
  expect(await shown(page, 'tools')()).toBe('visible');
  expect(await shown(page, 'skills')()).toBe('hidden');
  await expect(page.locator('#skills .panel[data-panel="tools"]')).toHaveCSS(
    'pointer-events',
    'auto',
  );
  const turning = await page
    .locator('#skills')
    .evaluate((section) =>
      section.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName),
    )
    .then((names) => names.filter((name) => name?.startsWith('toolkit')));
  expect(turning).toEqual([]);
  await page.locator('#skills .switch').getByText('Certifications', { exact: true }).click();
  await expect.poll(shown(page, 'certifications')).toBe('visible');
  expect(await shown(page, 'tools')()).toBe('hidden');
});

test.describe('the certificate viewer under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('moves between certificates without sliding', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cert-view .track')).toHaveCSS('scroll-behavior', 'auto');
  });
});

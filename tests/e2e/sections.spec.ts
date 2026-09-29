import { expect, test, type Locator, type Page } from '@playwright/test';
import { ICONS } from '../../src/lib/icons.ts';
import { profileValue, sectionHeading, yamlList, yamlValues } from '../support/content.ts';
import { scrollIntoViewSettled } from '../support/settle.ts';

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
  // Three in production, where What people say waits for real testimonials; four in previews.
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
  for (const toggle of await toggles.all()) await toggle.click();
  expect(await shown()).toEqual(new Set([shape('chevron-down')]));
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
    await page.getByRole('button', { name: sectionHeading('skills'), exact: true }).click();
    await expect(page.locator('#skills-body')).toBeHidden();
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

// The Toolkit (the Skills section): the tools as app icons, the skills as a list and the
// certifications as credential cards, straight from skills.yaml, one group at a time.
const SKILLS = 'src/content/skills.yaml';
// One group shows at a time; the others fade out but stay readable to screen readers, so what
// counts is each group's opacity.
const opacity = (page: Page, group: string) => () =>
  page
    .locator(`#skills .panel[data-panel="${group}"]`)
    .evaluate((panel) => getComputedStyle(panel).opacity);

// Tools: a dock on a patch of the live sky. Pointed at, an icon swells and its name pops up above,
// its neighbours swelling a little less; with no hover (a phone), the names sit under the icons.
test('the tools sit in a dock, and the one pointed at swells and shows its name', async ({
  page,
}) => {
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit);
  await toolkit.locator('.switch').getByText('Tools', { exact: true }).click();
  await expect(toolkit.locator('.desk sky-gradient')).toHaveCount(1);
  const tools = toolkit.locator('.dock .tool');
  const scale = (index: number) =>
    tools
      .nth(index)
      .locator('.tool-icon')
      .evaluate((icon) => getComputedStyle(icon).scale);
  expect(await scale(2)).toBe('none');
  await expect(tools.nth(2).locator('.tool-name')).toHaveCSS('opacity', '0');
  await scrollIntoViewSettled(tools.nth(2));
  await tools.nth(2).locator('.tool-icon').hover();
  await expect.poll(() => scale(2)).toBe('1.45');
  await expect.poll(() => scale(1)).toBe('1.2');
  await expect(tools.nth(2).locator('.tool-name')).toHaveCSS('opacity', '1');
});

test.describe('the tools on a touch screen', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox has no mobile emulation');
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('show their names under the icons, and a wave runs along the dock', async ({ page }) => {
    await page.goto('/');
    const tool = page.locator('#skills .dock .tool').first();
    await expect(tool.locator('.tool-name')).toHaveCSS('opacity', '1');
    await expect(tool.locator('.tool-name')).toHaveCSS('position', 'static');
    await expect(tool.locator('.tool-icon')).toHaveCSS('animation-name', 'tool-wave');
  });
});

// On a phone the skills show one phase at a time, picked from a segmented control, rather than
// every group's pills in a long column; the Toolkit's own switch keeps working around it.
test.describe('the skills on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('show one phase at a time, picked from a segmented control', async ({ page }) => {
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
    await phases.getByText(second, { exact: true }).click();
    await expect(group(second)).toBeVisible();
    await expect(group(first)).toBeHidden();
    await expect.poll(opacity(page, 'skills')).toBe('1');
  });

  // Tabbing onto the phases brings the skills forward, so focus never lands on a hidden group.
  test('focusing a phase shows the skills', async ({ page }) => {
    await page.goto('/');
    await scrollIntoViewSettled(page.locator('#skills'));
    await page.locator('#skills .phases input:checked').focus();
    await expect(page.locator('#skills input[value="skills"]')).toBeChecked();
    await expect.poll(opacity(page, 'skills')).toBe('1');
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
  // Every skill, the CV's included, as a pill under one of three headings.
  await expect(toolkit.locator('.skill-group h4')).toHaveText(yamlValues(SKILLS, 'group'));
  const pills = (await toolkit.locator('.skill').allTextContents()).map((text) => text.trim());
  expect(pills.sort()).toEqual(
    [...yamlList(SKILLS, 'skills'), ...yamlList(SKILLS, 'cvOnly')].sort(),
  );
  // Each certification is a card with its short name and issuer, named in full for screen readers.
  await expect(toolkit.locator('.cert-card .name')).toHaveText(yamlValues(SKILLS, 'short'));
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
  await page.keyboard.press('ArrowRight');
  await expect(count).toHaveText(`4 of ${total}`);
  await page.keyboard.press('ArrowRight');
  await expect(count).toHaveText(`1 of ${total}`);
  await viewer.getByRole('button', { name: 'Previous certificate' }).click();
  await expect(count).toHaveText(`${total} of ${total}`);
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
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

// Tabbing onto a card brings the certifications forward, so focus never lands on a hidden group.
test('focusing a certification card shows the certifications', async ({ page }) => {
  await page.goto('/');
  await scrollIntoViewSettled(page.locator('#skills'));
  await page.locator('#skills .cert-card').first().focus();
  await expect(page.locator('#skills input[value="certifications"]')).toBeChecked();
  await expect.poll(opacity(page, 'certifications')).toBe('1');
});

// While the Toolkit turns on its own, the cards take a click whenever they're the group in view. The
// turn is moved to the middle of the certifications' three seconds and held there, as hovering
// holds it, rather than waited for: sampled from outside under load, a nine-second loop's
// two-second window is easy to miss.
test('a certification card takes a click while the Toolkit turns', async ({ page }) => {
  await page.goto('/');
  const toolkit = page.locator('#skills');
  await scrollIntoViewSettled(toolkit);
  await toolkit.evaluate((section) => {
    for (const animation of section.getAnimations({ subtree: true })) {
      if (!(animation instanceof CSSAnimation)) continue;
      if (!animation.animationName.startsWith('toolkit-')) continue;
      // 7.5 s in: 1.5 s into the certifications' turn (they start 3 s ahead).
      animation.currentTime = 7500;
      animation.pause();
    }
  });
  await expect.poll(opacity(page, 'certifications')).toBe('1');
  await expect.poll(opacity(page, 'tools')).toBe('0');
  await toolkit.locator('.cert-card').first().click();
  await expect(page.getByRole('dialog', { name: 'Certificates' })).toBeVisible();
});

// It turns to the next group every three seconds on its own, until the visitor picks one.
test('the Toolkit turns from group to group until one is picked', async ({ page }) => {
  await page.goto('/');
  await scrollIntoViewSettled(page.locator('#skills'));
  await page.mouse.move(0, 0);
  // Each group is in view for about two seconds in nine; watched from inside the page, frame by
  // frame, so a slow round trip from the test can't miss one.
  for (const group of ['tools', 'skills', 'certifications', 'tools']) {
    await page.waitForFunction(
      (name) => {
        const panel = document.querySelector(`#skills .panel[data-panel="${name}"]`);
        return !!panel && getComputedStyle(panel).opacity === '1';
      },
      group,
      { polling: 'raf', timeout: 10_000 },
    );
  }
  await page.locator('#skills .switch').getByText('Skills', { exact: true }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(4000);
  expect(await opacity(page, 'skills')()).toBe('1');
  expect(await opacity(page, 'tools')()).toBe('0');
  expect(await opacity(page, 'certifications')()).toBe('0');
});

test.describe('the Toolkit under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('holds still on the tools, which can still be pointed at', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3500);
    expect(await opacity(page, 'tools')()).toBe('1');
    expect(await opacity(page, 'skills')()).toBe('0');
    await expect(page.locator('#skills .panel[data-panel="tools"]')).toHaveCSS(
      'pointer-events',
      'auto',
    );
  });

  test('moves between certificates without sliding', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cert-view .track')).toHaveCSS('scroll-behavior', 'auto');
  });
});

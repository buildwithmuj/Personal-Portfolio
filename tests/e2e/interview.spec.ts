import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { profileValue, yamlValues } from '../support/content.ts';
import { scrollIntoViewSettled } from '../support/settle.ts';

const EMAIL = profileValue('email');
const QUESTIONS = yamlValues('src/content/profile.yaml', 'question');
// Recorded answers: the owner reading an answer aloud (`audio` under a question).
const RECORDED = yamlValues('src/content/profile.yaml', 'audio').length;
const SIGNED = `Answered by ${profileValue('name').split(' ')[0]}, not an AI`;

const pill = (section: Locator, question: string) =>
  section.getByRole('button', { name: question, exact: true });

// Ask me: a card after an AI chat, over the owner's own written answers, with no AI behind it. It
// opens on a greeting under a ball of sky; a question pill, or a typed question, swaps in its answer.
test('Ask me opens on its greeting, and a question pill shows that answer', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  await expect(section.getByText('Ask me anything.')).toBeVisible();
  await expect(section.locator('.answer:visible')).toHaveCount(0);
  for (const question of QUESTIONS) await expect(pill(section, question)).toBeVisible();
  await pill(section, 'Proudest project?').click();
  await expect(section.getByText('Ask me anything.')).toBeHidden();
  const answer = section.locator('.answer:visible');
  await expect(answer).toHaveCount(1);
  await expect(answer.getByRole('heading')).toHaveText('Proudest project?');
  await expect(pill(section, 'Proudest project?')).toHaveAttribute('aria-pressed', 'true');
  await expect(section.getByText(SIGNED)).toBeVisible();
});

// The ball of sky above the greeting floats in place, bobbing gently over its shadow; under reduced
// motion it holds still (global.css).
const floating = (page: Page) =>
  page.locator('#interview .hello .orb').evaluate((orb) => {
    const style = getComputedStyle(orb);
    return `${style.animationName} ${style.animationIterationCount}`;
  });

test('the ball above the greeting floats in place', async ({ page }) => {
  await page.goto('/');
  await scrollIntoViewSettled(page.locator('#interview'));
  expect(await floating(page)).toBe('ask-orb-float infinite');
  await expect(page.locator('#interview .orb-shadow')).toHaveCount(1);
});

test.describe('under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the ball holds still', async ({ page }) => {
    await page.goto('/');
    expect(await floating(page)).toBe('ask-orb-float 1');
  });
});

// The questions wrap on wider screens; on phones they run in one row, swiped sideways, so the card
// stays short.
const pillRows = (section: Locator) =>
  section.locator('.pills').evaluate((list) => {
    const tops = [...list.querySelectorAll('button')].map((pill) =>
      Math.round(pill.getBoundingClientRect().top),
    );
    return { rows: new Set(tops).size, scrolls: list.scrollWidth > list.clientWidth };
  });

test('the questions wrap on a wide screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  expect((await pillRows(section)).rows).toBeGreaterThan(1);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the questions run in one row, swiped sideways', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#interview');
    await scrollIntoViewSettled(section);
    expect(await pillRows(section)).toEqual({ rows: 1, scrolls: true });
    const pageFits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(pageFits).toBe(true);
  });
});

test("typing fades the questions that don't fit, and Enter shows the best fit", async ({
  page,
}) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  const input = section.getByRole('textbox', { name: 'Ask me a question' });
  await input.fill('proud');
  await expect(pill(section, 'Proudest project?')).not.toHaveClass(/\bfaded\b/);
  await expect(pill(section, QUESTIONS[0] ?? '')).toHaveClass(/\bfaded\b/);
  // Faded, a question is still readable (WCAG 1.4.3).
  await expect(pill(section, QUESTIONS[0] ?? '')).toHaveCSS('opacity', '0.6');
  const contrast = await new AxeBuilder({ page })
    .include('#interview')
    .withRules(['color-contrast'])
    .analyze();
  expect(contrast.violations).toEqual([]);
  await input.press('Enter');
  await expect(section.locator('.answer:visible').getByRole('heading')).toHaveText(
    'Proudest project?',
  );
  // Sent, the field clears and every question is back in full.
  await expect(input).toHaveValue('');
  await expect(section.locator('.pills .faded')).toHaveCount(0);
});

test('the send arrow asks the typed question too', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  await section.getByRole('textbox', { name: 'Ask me a question' }).fill('tools');
  await section.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(section.locator('.answer:visible').getByRole('heading')).toHaveText(
    'Which tools do you use?',
  );
});

test('a question with no written answer becomes an email', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  const question = 'Do you juggle xylophones?';
  const input = section.getByRole('textbox', { name: 'Ask me a question' });
  await input.fill(question);
  await input.press('Enter');
  await expect(section.locator('.answer:visible')).toHaveCount(0);
  await expect(section.getByText(SIGNED)).toBeHidden();
  const send = section.getByRole('link', { name: 'Send me this question' });
  await expect(send).toHaveAttribute(
    'href',
    `mailto:${EMAIL}?subject=${encodeURIComponent('A question from your site')}` +
      `&body=${encodeURIComponent(question)}`,
  );
});

// Each recorded answer gets a play button beside its signature; the others get none.
test('only recorded answers offer to be heard', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#interview voice-intro')).toHaveCount(RECORDED);
});

test('a recorded answer plays and stops as another answer takes its place', async ({ page }) => {
  test.skip(RECORDED === 0, 'No answer is recorded yet');
  await page.goto('/');
  const section = page.locator('#interview');
  const player = section.locator('voice-intro').first();
  const heading = await player.locator('xpath=ancestor::article//h3').textContent();
  await pill(section, heading ?? '').click();
  await player.getByRole('button', { name: 'Hear my answer' }).click();
  await expect(player).toHaveAttribute('data-playing', '');
  const other = QUESTIONS.find((question) => question !== heading) ?? '';
  await pill(section, other).click();
  await expect(player).not.toHaveAttribute('data-playing');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every question and answer shows in turn, signed once', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#interview');
    await expect(section.getByRole('textbox')).toHaveCount(0);
    await expect(section.getByText('Ask me anything.')).toBeHidden();
    await expect(section.locator('.answer').getByRole('heading')).toHaveText(QUESTIONS);
    await expect(section.getByText(SIGNED)).toHaveCount(1);
  });
});

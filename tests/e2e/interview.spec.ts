import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '../support/test.ts';
import { profileValue, yamlValues } from '../support/content.ts';
import { scrollIntoViewSettled } from '../support/settle.ts';

const EMAIL = profileValue('email');
const QUESTIONS = yamlValues('src/content/profile.yaml', 'question');
// Recorded answers: the owner reading an answer aloud (`audio` under a question).
const RECORDED = yamlValues('src/content/profile.yaml', 'audio').length;
const SIGNED = `Answered by ${profileValue('name').split(' ')[0]}`;

// Two questions the tests pick and type towards, however they are worded.
const PROUD = QUESTIONS.find((question) => /proud/i.test(question)) ?? '';
const TOOLS = QUESTIONS.find((question) => /tools/i.test(question)) ?? '';

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
  await pill(section, PROUD).click();
  await expect(section.getByText('Ask me anything.')).toBeHidden();
  const answer = section.locator('.answer:visible');
  await expect(answer).toHaveCount(1);
  await expect(answer.getByRole('heading')).toHaveText(PROUD);
  await expect(pill(section, PROUD)).toHaveAttribute('aria-pressed', 'true');
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

// On wider screens every question shows, wrapping. On a phone the first three show with a pill
// that opens the rest in place, so the card stays short and nothing scrolls sideways.
const shownQuestions = (section: Locator) =>
  section.locator('.pills button[aria-pressed]:visible').allTextContents();

test('every question shows on a wide screen, with no "more" pill', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  expect((await shownQuestions(section)).map((text) => text.trim())).toEqual(QUESTIONS);
  await expect(section.locator('.pills .more')).toBeHidden();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('three questions show, and a pill opens the rest in place', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#interview');
    await scrollIntoViewSettled(section);
    expect((await shownQuestions(section)).map((text) => text.trim())).toEqual(
      QUESTIONS.slice(0, 3),
    );
    const more = section.getByRole('button', { name: `${QUESTIONS.length - 3} more questions` });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    // Under a full parallel run WebKit now and then drops a click that lands mid-layout: click the
    // pill (found by its class, since its name changes once open) until it has opened.
    const pill = section.locator('.pills .more');
    await expect(async () => {
      if ((await pill.getAttribute('aria-expanded')) !== 'true') await pill.click();
      await expect(pill).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
    }).toPass();
    // Waited for: under a full parallel run the click's effect can land a moment after it returns.
    await expect
      .poll(async () => (await shownQuestions(section)).map((text) => text.trim()))
      .toEqual(QUESTIONS);
    const fewer = section.getByRole('button', { name: 'Fewer questions' });
    await expect(fewer).toHaveAttribute('aria-expanded', 'true');
    await fewer.click();
    await expect.poll(async () => (await shownQuestions(section)).length).toBe(3);
    // Nothing scrolls sideways: not the questions, not the page.
    const fits = await section
      .locator('.pills')
      .evaluate(
        (list) =>
          list.scrollWidth <= list.clientWidth &&
          document.documentElement.scrollWidth <= window.innerWidth,
      );
    expect(fits).toBe(true);
  });
});

test.describe('typing on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  // The question that fits may be one of those behind "more": while a visitor types, every pill
  // shows, so the one that fits is there to see, and the rest fade.
  test('shows the question that fits, even one that was behind "more"', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#interview');
    await scrollIntoViewSettled(section);
    const hidden = QUESTIONS.find((question) => /learning/i.test(question)) ?? '';
    expect(QUESTIONS.indexOf(hidden)).toBeGreaterThanOrEqual(3);
    await expect(pill(section, hidden)).toBeHidden();
    const input = section.getByRole('textbox', { name: 'Ask me a question' });
    await input.fill('learning');
    await expect(pill(section, hidden)).toBeVisible();
    await expect(pill(section, hidden)).not.toHaveClass(/faded/);
    await input.fill('');
    await expect(pill(section, hidden)).toBeHidden();
  });
});

// A blue pill at the end of the questions says a visitor can ask their own, and takes them to the
// field.
test('"Ask your own" puts the cursor in the field', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  await section.getByRole('button', { name: 'Ask your own' }).click();
  await expect(section.getByRole('textbox', { name: 'Ask me a question' })).toBeFocused();
});

test("typing fades the questions that don't fit, and Enter shows the best fit", async ({
  page,
}) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  const input = section.getByRole('textbox', { name: 'Ask me a question' });
  await input.fill('proud');
  await expect(pill(section, PROUD)).not.toHaveClass(/\bfaded\b/);
  await expect(pill(section, QUESTIONS[0] ?? '')).toHaveClass(/\bfaded\b/);
  // Faded, a question is still readable (WCAG 1.4.3).
  await expect(pill(section, QUESTIONS[0] ?? '')).toHaveCSS('opacity', '0.6');
  const contrast = await new AxeBuilder({ page })
    .include('#interview')
    .withRules(['color-contrast'])
    .analyze();
  expect(contrast.violations).toEqual([]);
  await input.press('Enter');
  await expect(section.locator('.answer:visible').getByRole('heading')).toHaveText(PROUD);
  // Sent, the field clears and every question is back in full.
  await expect(input).toHaveValue('');
  await expect(section.locator('.pills .faded')).toHaveCount(0);
});

// The field shows focus with the site's ring, which forced-colours mode keeps, not a faint glow.
test('the question field wears the focus ring', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  await section.getByRole('textbox', { name: 'Ask me a question' }).focus();
  await expect(section.locator('.field')).toHaveCSS('outline-style', 'solid');
  await expect(section.locator('.field')).toHaveCSS('outline-width', '3px');
});

test('the send arrow asks the typed question too', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  await section.getByRole('textbox', { name: 'Ask me a question' }).fill('tools');
  await section.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(section.locator('.answer:visible').getByRole('heading')).toHaveText(TOOLS);
});

test('a question with no written answer is quoted back with a clear way to send it', async ({
  page,
}) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  const question = 'Do you juggle xylophones?';
  const input = section.getByRole('textbox', { name: 'Ask me a question' });
  await input.fill(question);
  await input.press('Enter');
  await expect(section.locator('.answer:visible')).toHaveCount(0);
  await expect(section.getByText(SIGNED)).toBeHidden();
  const miss = section.locator('.miss');
  await expect(miss.getByRole('heading')).toHaveText(`“${question}”`);
  // Centred, like the greeting whose place it takes.
  await expect(miss).toHaveCSS('text-align', 'center');
  const [card, button] = await Promise.all([
    section.locator('.ask').boundingBox(),
    miss.getByRole('link', { name: 'Email me this question' }).boundingBox(),
  ]);
  const centre = (box: { x: number; width: number } | null) => (box ? box.x + box.width / 2 : 0);
  expect(Math.abs(centre(card) - centre(button))).toBeLessThan(1);
  const send = miss.getByRole('link', { name: 'Email me this question' });
  await expect(send).toHaveAttribute(
    'href',
    `mailto:${EMAIL}?subject=${encodeURIComponent('A question from your site')}` +
      `&body=${encodeURIComponent(question)}`,
  );
  await expect(miss.getByRole('link', { name: 'book a call' })).toHaveAttribute('href', '#contact');
});

// A question of only common words ("Who are you?") matches nothing to search on; it still gets the
// offer to send it, never silence.
test('a question of only common words still gets an answer of some kind', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  const input = section.getByRole('textbox', { name: 'Ask me a question' });
  await input.fill('Who are you?');
  await input.press('Enter');
  await expect(section.locator('.miss').getByRole('heading')).toHaveText('“Who are you?”');
  await expect(section.locator('.answer:visible')).toHaveCount(0);
});

// Typing can land on an answer that isn't quite what was asked, so under it a quiet line still
// sends the question as typed. A question picked from the pills doesn't need it.
test('an answer found by typing offers to send the question as typed', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await scrollIntoViewSettled(section);
  const input = section.getByRole('textbox', { name: 'Ask me a question' });
  await input.fill('tools');
  await input.press('Enter');
  await expect(section.locator('.answer:visible').getByRole('heading')).toHaveText(TOOLS);
  const own = section.getByRole('link', { name: 'Send me your question' });
  await expect(own).toBeVisible();
  await expect(own).toHaveAttribute(
    'href',
    `mailto:${EMAIL}?subject=${encodeURIComponent('A question from your site')}` +
      `&body=${encodeURIComponent('tools')}`,
  );
  await pill(section, QUESTIONS[0] ?? '').click();
  await expect(own).toBeHidden();
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

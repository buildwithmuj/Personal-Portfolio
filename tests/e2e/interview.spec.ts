import { expect, test } from '@playwright/test';
import { profileValue, yamlValues } from '../support/content.ts';

const EMAIL = profileValue('email');
const QUESTIONS = yamlValues('src/content/profile.yaml', 'question');
// Recorded answers: the owner reading an answer aloud (`audio` under a question).
const RECORDED = yamlValues('src/content/profile.yaml', 'audio').length;

// Interview me, as "Ask me": a prompt over the owner's own written answers, with no AI behind it.
test('Ask me opens on the first answer, signed by the owner', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole('combobox', { name: 'Ask me a question' })).toBeVisible();
  const answer = section.locator('.answer:visible');
  await expect(answer).toHaveCount(1);
  await expect(answer.getByRole('heading')).toHaveText(QUESTIONS[0] ?? '');
  await expect(answer).toContainText(
    `Answered by ${profileValue('name').split(' ')[0]}, not an AI`,
  );
});

test('typing narrows the questions, and Enter shows that answer', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await section.scrollIntoViewIfNeeded();
  const input = section.getByRole('combobox', { name: 'Ask me a question' });
  await input.fill('proud');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(section.getByRole('option')).toHaveText(['Proudest project?']);
  await input.press('Enter');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(section.locator('.answer:visible').getByRole('heading')).toHaveText(
    'Proudest project?',
  );
});

test('the arrow keys move through the suggestions', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await section.scrollIntoViewIfNeeded();
  const input = section.getByRole('combobox', { name: 'Ask me a question' });
  await input.focus();
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', 'ask-1');
  await expect(section.locator('#ask-1')).toHaveAttribute('aria-selected', 'true');
  await input.press('Enter');
  await expect(section.locator('.answer:visible').getByRole('heading')).toHaveText(
    QUESTIONS[1] ?? '',
  );
});

test('a question with no written answer becomes an email', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#interview');
  await section.scrollIntoViewIfNeeded();
  const question = 'Do you juggle xylophones?';
  await section.getByRole('combobox', { name: 'Ask me a question' }).fill(question);
  await expect(section.locator('.answers')).toBeHidden();
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
  const input = section.getByRole('combobox', { name: 'Ask me a question' });
  await input.fill(heading ?? '');
  await input.press('Enter');
  await player.getByRole('button', { name: 'Hear my answer' }).click();
  await expect(player).toHaveAttribute('data-playing', '');
  const other = QUESTIONS.find((question) => question !== heading) ?? '';
  await input.fill(other);
  await input.press('Enter');
  await expect(player).not.toHaveAttribute('data-playing');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every question and answer shows in turn', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#interview');
    await expect(section.getByRole('combobox')).toHaveCount(0);
    await expect(section.locator('.answer').getByRole('heading')).toHaveText(QUESTIONS);
  });
});

import { expect, test } from '@playwright/test';
import { sectionHeading } from '../support/content.ts';

// Long sections can be collapsed with a round toggle (named after the section, announcing whether
// it's expanded); How I work starts collapsed, the others start open.
test('How I work starts collapsed and opens with its toggle', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: sectionHeading('method'), exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#method-body')).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#method-body')).toBeVisible();
});

test('Selected work starts open and can be hidden', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: sectionHeading('work'), exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#work-body')).toBeVisible();
  await toggle.click();
  await expect(page.locator('#work-body')).toBeHidden();
  // The Work / Personal projects switch hides with the section.
  await expect(page.locator('#work fieldset')).toBeHidden();
});

test('clicking a collapsible section title toggles it too', async ({ page }) => {
  await page.goto('/');
  await page.locator('#method .section-title').click();
  await expect(page.locator('#method-body')).toBeVisible();
  await page.locator('#method h2').click();
  await expect(page.locator('#method-body')).toBeHidden();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every section stays open and no toggle shows', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#method .collapse')).toBeHidden();
    await expect(page.locator('#work .collapse')).toBeHidden();
    await expect(page.locator('#method-body')).toBeVisible();
  });
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
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const ring = page.locator('.to-top .done');
  await expect(ring).toBeVisible();
  await expect
    .poll(async () =>
      parseFloat(await ring.evaluate((el) => getComputedStyle(el).strokeDashoffset)),
    )
    .toBeLessThan(1);
});

test('the About statement fills to full colour as it scrolls into view', async ({ page }) => {
  await page.goto('/');
  const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
  test.skip(!supported, 'This browser has no CSS view timeline, so the statement is plain text');
  const span = page.locator('.statement span');
  await expect
    .poll(async () => span.evaluate((el) => getComputedStyle(el).animationTimeline))
    .toBe('--statement');
});

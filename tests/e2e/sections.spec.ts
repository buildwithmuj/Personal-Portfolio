import { expect, test } from '@playwright/test';
import { sectionHeading } from '../support/content.ts';

// Long sections can be collapsed; How I work starts collapsed, the others start open.
test('How I work starts collapsed and opens with its Show button', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#method .collapse');
  await expect(toggle).toHaveAccessibleName(`Show ${sectionHeading('method')}`);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#method-body')).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAccessibleName(`Hide ${sectionHeading('method')}`);
  await expect(page.locator('#method-body')).toBeVisible();
});

test('Selected work starts open and can be hidden', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#work .collapse');
  await expect(toggle).toHaveAccessibleName(`Hide ${sectionHeading('work')}`);
  await expect(page.locator('#work-body')).toBeVisible();
  await toggle.click();
  await expect(page.locator('#work-body')).toBeHidden();
  // The Work / Personal projects switch hides with the section.
  await expect(page.locator('#work fieldset')).toBeHidden();
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

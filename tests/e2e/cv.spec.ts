import { expect, test } from '@playwright/test';

const sections = ['Experience', 'Skills & certifications', 'Education', 'Languages & outside work'];

// The CV page carries the CV's sections, each with the home page's open/close toggle.
test('every CV section starts open and can be collapsed', async ({ page }) => {
  await page.goto('/cv');
  for (const name of sections) {
    const section = page.getByRole('region', { name });
    const toggle = section.getByRole('button', { name, exact: true });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(section.getByRole('listitem').first()).toBeHidden();
  }
});

test('each role lists its highlights, and education and languages are filled in', async ({
  page,
}) => {
  await page.goto('/cv');
  const roles = page.locator('#cv-experience .timeline > li');
  await expect(roles).toHaveCount(3);
  for (const role of await roles.all()) {
    await expect(role.locator('.highlights li').first()).toBeVisible();
  }
  const education = page.getByRole('region', { name: 'Education' });
  await expect(education.getByRole('listitem')).not.toHaveCount(0);
  const languages = page.getByRole('region', { name: 'Languages & outside work' });
  await expect(languages.getByRole('listitem')).not.toHaveCount(0);
});

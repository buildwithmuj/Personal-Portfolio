import { expect, test } from '@playwright/test';
import { SERVER_ONLY } from '../support/site.ts';

test('the contact section offers email, booking and CV links', async ({ page }) => {
  await page.goto('/');
  const contact = page.getByRole('region', { name: 'Contact' });
  await expect(contact.getByRole('link', { name: 'alex@example.com' })).toHaveAttribute(
    'href',
    'mailto:alex@example.com',
  );
  const booking = contact.getByRole('link', { name: /^Book a call/ });
  await expect(booking).toHaveAttribute('href', 'https://cal.com/');
  await expect(booking).toHaveAttribute('target', '_blank');
  await expect(booking).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(booking).toHaveAccessibleName('Book a call (opens in a new tab)');
  await expect(contact.getByRole('link', { name: /^Download CV/ })).toHaveAttribute(
    'href',
    '/cv.pdf',
  );
});

test('the copy button copies the address and announces it', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Only Chromium lets tests grant clipboard permissions');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Copy email address' }).click();
  await expect(page.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('alex@example.com');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the copy button stays hidden and the email link still works', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Copy email address' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'alex@example.com' })).toBeVisible();
  });
});

test('the CV is served as a PDF', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const response = await request.get('/cv.pdf');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
});

test('security.txt lists the same email as the site', async ({ page, request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  await page.goto('/');
  const mailto = await page.locator('#contact a[href^="mailto:"]').first().getAttribute('href');
  const securityTxt = await (await request.get('/.well-known/security.txt')).text();
  expect(securityTxt).toContain(`Contact: ${mailto}`);
});

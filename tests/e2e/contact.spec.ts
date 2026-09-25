import { expect, test } from '@playwright/test';
import { profileValue } from '../support/content.ts';
import { SERVER_ONLY } from '../support/site.ts';

const EMAIL = profileValue('email');
const NAME = profileValue('name');
const BOOKING_URL = profileValue('bookingUrl');
const EMBED_URL = `${BOOKING_URL}?embed=true`;
const CAL = /^https:\/\/(?:app\.)?cal\.com\//;

test.beforeEach(async ({ page }) => {
  // CI never depends on Cal.com: every request to it gets a stub (content spec §11).
  await page.route(CAL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Stub</title><p>Booking stub</p>',
    }),
  );
});

test('the contact section offers email, CV, socials and booking', async ({ page }) => {
  await page.goto('/');
  const contact = page.locator('#contact');
  await expect(contact.getByRole('link', { name: EMAIL })).toHaveAttribute(
    'href',
    `mailto:${EMAIL}`,
  );
  await expect(contact.getByRole('link', { name: 'Download CV' })).toHaveAttribute(
    'href',
    '/cv.pdf',
  );
  for (const platform of ['LinkedIn', 'X', 'TikTok', 'GitHub']) {
    await expect(contact.getByRole('link', { name: platform, exact: true })).toHaveCount(1);
  }
  await expect(contact.locator('summary')).toHaveText('Book a 30-minute call');
});

test('the copy button copies the address and announces it', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Only Chromium lets tests grant clipboard permissions');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const contact = page.locator('#contact');
  await contact.getByRole('button', { name: 'Copy email address' }).click();
  await expect(contact.locator('[role="status"]')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EMAIL);
});

test('nothing loads from Cal.com until the booking panel opens', async ({ page }) => {
  const calRequests: string[] = [];
  page.on('request', (request) => {
    if (CAL.test(request.url())) calRequests.push(request.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(calRequests).toEqual([]);
  await expect(page.locator('#contact iframe')).toHaveCount(0);

  await page.locator('#contact summary').click();
  const frame = page.locator('#contact iframe');
  await expect(frame).toHaveAttribute('src', EMBED_URL);
  await expect(frame).toHaveAttribute('title', `Book a call with ${NAME} on Cal.com`);
  await expect(frame).toHaveAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-forms allow-popups',
  );
  await expect.poll(() => calRequests.length).toBeGreaterThan(0);
});

test('opening the booking panel causes no CSP violation', async ({ page }) => {
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.defineProperty(window, '__cspViolations', { value: violations });
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  await page.goto('/');
  await page.locator('#contact summary').click();
  await expect(page.frameLocator('#contact iframe').getByText('Booking stub')).toBeVisible();
  const violations = await page.evaluate(
    () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
  );
  expect(violations).toEqual([]);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the copy button stays hidden and the email link still works', async ({ page }) => {
    await page.goto('/');
    const contact = page.locator('#contact');
    await expect(contact.getByRole('button', { name: 'Copy email address' })).toHaveCount(0);
    await expect(contact.getByRole('link', { name: EMAIL })).toBeVisible();
  });

  test('the booking panel offers the booking page link instead of a frame', async ({ page }) => {
    await page.goto('/');
    await page.locator('#contact summary').click();
    await expect(page.locator('#contact iframe')).toHaveCount(0);
    const fallback = page.locator('#contact').getByRole('link', { name: /Open the booking page/ });
    await expect(fallback).toHaveAttribute('href', BOOKING_URL);
    await expect(fallback).toHaveAttribute('target', '_blank');
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

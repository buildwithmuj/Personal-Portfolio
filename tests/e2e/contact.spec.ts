import { expect, test } from '../support/test.ts';
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

test('the contact section offers booking, email, CV and socials', async ({ page }) => {
  await page.goto('/');
  const contact = page.locator('#contact');
  await expect(contact.getByRole('link', { name: 'Drop an email' })).toHaveAttribute(
    'href',
    `mailto:${EMAIL}`,
  );
  await expect(contact.getByRole('link', { name: 'View CV' })).toHaveAttribute('href', '/cv.pdf');
  for (const platform of ['LinkedIn', 'X', 'TikTok', 'GitHub']) {
    await expect(contact.getByRole('link', { name: platform, exact: true })).toHaveCount(1);
  }
  await expect(contact.locator('summary')).toHaveText('Book a 30-minute call');
  // The button stands in for the address, which the section no longer spells out.
  await expect(contact.getByText(EMAIL)).toHaveCount(0);
});

// Invitation first: the call leads, under the availability, with Drop an email beside it; the CV
// and socials follow.
test('the contact section leads with the call', async ({ page }) => {
  await page.goto('/');
  const contact = page.locator('#contact');
  await expect(contact.getByText("Let's talk it through.")).toBeVisible();
  await expect(contact.getByText(profileValue('availability'))).toBeVisible();
  const callFirst = await contact.evaluate((section) => {
    const call = section.querySelector('summary');
    const email = section.querySelector('a[href^="mailto:"]');
    return !!call && !!email && !!(call.compareDocumentPosition(email) & 4);
  });
  expect(callFirst).toBe(true);
  const call = await contact.locator('summary').boundingBox();
  const mail = await contact.getByRole('link', { name: 'Drop an email' }).boundingBox();
  expect(mail?.y).toBe(call?.y);
  expect(mail?.height).toBe(call?.height);
});

// The CV and social icons sit centred beneath the card, on phones and desktops alike.
for (const viewport of [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
]) {
  test(`the icon row sits centred under the card (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const offset = await page.locator('#contact').evaluate((section) => {
      const card = section.querySelector('.invite')?.getBoundingClientRect();
      const icons = section.querySelector('.socials')?.getBoundingClientRect();
      if (!card || !icons) return null;
      return icons.left + icons.width / 2 - (card.left + card.width / 2);
    });
    expect(Math.abs(offset ?? 100)).toBeLessThanOrEqual(1);
  });
}

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

// The CV lives in the pop-up and the PDF; there's no separate CV page (removed 2026-09-29).
test('there is no separate CV page', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  expect((await request.get('/cv')).status()).toBe(404);
});

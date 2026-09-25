import { expect, test } from '@playwright/test';
import { builtPagePaths, SITE_URL } from '../support/site.ts';

for (const path of builtPagePaths()) {
  test.describe(`page ${path}`, () => {
    test('loads without console errors or CSP violations', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        const violations: string[] = [];
        Object.defineProperty(window, '__cspViolations', { value: violations });
        document.addEventListener('securitypolicyviolation', (event) => {
          violations.push(`${event.violatedDirective} ${event.blockedURI}`);
        });
      });
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState('load');
      const violations = await page.evaluate(
        () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
      );
      expect(violations).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('has one h1 and complete SEO metadata', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      expect(await page.title()).toMatch(/ — /);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0).toBeGreaterThan(0);
      expect(description?.length ?? 0).toBeLessThanOrEqual(160);
      const canonical = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
      for (const property of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']) {
        await expect(page.locator(`meta[property="${property}"]`)).toHaveCount(1);
      }
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle).toBe(await page.title());
      const ogDescription = await page
        .locator('meta[property="og:description"]')
        .getAttribute('content');
      expect(ogDescription).toBe(description);
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      const imagePathname = new URL(ogImage ?? '').pathname;
      const imageResponse = await page.request.get(imagePathname);
      expect(imageResponse.status()).toBe(200);
      expect(imageResponse.headers()['content-type']).toMatch(/^image\//);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image',
      );
      // The production build must stay indexable (spec §8).
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    });

    test('does not scroll sideways at 320px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('ships a strict Content Security Policy', async ({ page }) => {
      await page.goto(path);
      const meta = page.locator('meta[http-equiv="content-security-policy"]');
      await expect(meta).toHaveCount(1);
      const content = (await meta.getAttribute('content')) ?? '';
      for (const directive of [
        "default-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ]) {
        expect(content).toContain(directive);
      }
      expect(content).toMatch(/script-src[^;]*/);
      expect(content).toMatch(/style-src[^;]*/);
      expect(content).toContain("style-src 'self' 'sha256-");
      // Every built page's script-src also carries a hash (checked against dist/*.html).
      expect(content).toContain("script-src 'self' 'sha256-");
      expect(content).not.toContain('unsafe-inline');
      expect(content).not.toContain('unsafe-eval');
    });
  });
}

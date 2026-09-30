import { createHash } from 'node:crypto';
import { expect, test } from '../support/test.ts';
import { COUNT_URL } from '../../site.config.ts';
import { MOTION_SCRIPT } from '../../src/lib/motion.ts';
import { builtPagePaths, SITE_ORIGIN } from '../support/site.ts';

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

    // Stand-in content is fine while drafting, but the word itself must never be published: not in
    // the text (hidden parts included), an image's description or a link preview's tags.
    test('publishes no placeholder wording', async ({ page }) => {
      await page.goto(path);
      const published = await page.evaluate(() => {
        const words: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.parentElement?.closest('script, style')) words.push(node.textContent ?? '');
        }
        for (const image of document.querySelectorAll('img')) words.push(image.alt);
        for (const meta of document.querySelectorAll('meta[content]')) {
          words.push(meta.getAttribute('content') ?? '');
        }
        return words.join('\n');
      });
      expect(published).not.toMatch(/placeholder/i);
    });

    test('has one h1 and complete SEO metadata', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
      expect(await page.title()).toMatch(/ — /);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0).toBeGreaterThan(0);
      expect(description?.length ?? 0).toBeLessThanOrEqual(160);
      const canonical = path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
      for (const property of [
        'og:title',
        'og:description',
        'og:url',
        'og:image',
        'og:image:alt',
        'og:image:width',
        'og:image:height',
      ]) {
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
      // Measured once every section has been on screen, so anything that starts as it's reached
      // (a sky, a reveal) has started, and could widen the page (Ask me's text box once did).
      await page.evaluate(async () => {
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        for (const section of document.querySelectorAll('.stack > .shell')) {
          section.scrollIntoView({ block: 'center' });
          await frame();
          await frame();
        }
      });
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
        'frame-src https://cal.com https://app.cal.com',
        // The weather, and the visitor counter once it is switched on (site.config.ts).
        `connect-src 'self' https://api.open-meteo.com${COUNT_URL ? ` ${new URL(COUNT_URL).origin}` : ''};`,
      ]) {
        expect(content).toContain(directive);
      }
      // The one inline script Astro doesn't hash itself (src/lib/motion.ts, astro.config.ts).
      expect(content).toContain(
        `'sha256-${createHash('sha256').update(MOTION_SCRIPT).digest('base64')}'`,
      );
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

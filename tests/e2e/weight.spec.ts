import { expect, test } from '@playwright/test';
import { checkPageWeight, compressedSize, type LoadedResource } from '../support/page-weight.ts';
import { BASE_URL, builtPagePaths } from '../support/site.ts';

for (const path of [...builtPagePaths(), '/does-not-exist']) {
  test(`${path} stays within the page-weight budget`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Resource sizes do not depend on the browser engine');
    const resources: LoadedResource[] = [];
    const files: Record<'script' | 'stylesheet', string[]> = { script: [], stylesheet: [] };
    const pending: Promise<void>[] = [];
    page.on('response', (response) => {
      pending.push(
        response
          .body()
          .catch(() => Buffer.alloc(0)) // redirects have no body
          .then((body) => {
            const type = response.request().resourceType();
            if (type === 'script' || type === 'stylesheet') files[type].push(body.toString('utf8'));
            resources.push({ url: response.url(), type, bytes: body.length });
          }),
      );
    });
    await page.goto(path);
    // Scroll to the bottom in viewport-height steps so lazy images below the fold load.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      let scrolled = 0;
      while (scrolled < document.documentElement.scrollHeight) {
        window.scrollBy(0, step);
        scrolled += step;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });
    await page.waitForLoadState('networkidle');
    await Promise.all(pending);
    // Astro inlines small scripts and styles into the page, so no response carries them.
    const inline = await page.evaluate(() => ({
      scripts: [...document.querySelectorAll('script:not([src])')]
        .filter((el) => el.getAttribute('type') !== 'application/ld+json')
        .map((el) => el.textContent ?? ''),
      styles: [...document.querySelectorAll('style')].map((el) => el.textContent ?? ''),
    }));
    const compressed = {
      script: compressedSize([...files.script, ...inline.scripts]),
      stylesheet: compressedSize([...files.stylesheet, ...inline.styles]),
    };
    expect(checkPageWeight(resources, new URL(BASE_URL).origin, compressed)).toEqual([]);
  });
}

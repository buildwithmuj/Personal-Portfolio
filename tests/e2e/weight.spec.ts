import { expect, test } from '@playwright/test';
import { checkPageWeight, type LoadedResource } from '../support/page-weight.ts';
import { BASE_URL, builtPagePaths } from '../support/site.ts';

for (const path of [...builtPagePaths(), '/does-not-exist']) {
  test(`${path} stays within the page-weight budget`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Resource sizes do not depend on the browser engine');
    const resources: LoadedResource[] = [];
    const pending: Promise<void>[] = [];
    page.on('response', (response) => {
      pending.push(
        response
          .body()
          .catch(() => Buffer.alloc(0)) // redirects have no body
          .then((body) => {
            resources.push({
              url: response.url(),
              type: response.request().resourceType(),
              bytes: body.length,
            });
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
    const inline = await page.evaluate(() => {
      const byteLength = (text: string) => new TextEncoder().encode(text).length;
      const script = [...document.querySelectorAll('script:not([src])')]
        .filter((el) => el.getAttribute('type') !== 'application/ld+json')
        .reduce((sum, el) => sum + byteLength(el.textContent ?? ''), 0);
      const stylesheet = [...document.querySelectorAll('style')].reduce(
        (sum, el) => sum + byteLength(el.textContent ?? ''),
        0,
      );
      return { script, stylesheet };
    });
    expect(checkPageWeight(resources, new URL(BASE_URL).origin, inline)).toEqual([]);
  });
}

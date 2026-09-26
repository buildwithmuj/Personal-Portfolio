import { expect, test } from '@playwright/test';
import { checkPageWeight, compressedSize, type LoadedResource } from '../support/page-weight.ts';
import { BASE_URL, builtPagePaths } from '../support/site.ts';

for (const path of [...builtPagePaths(), '/does-not-exist']) {
  test(`${path} stays within the page-weight budget`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Resource sizes do not depend on the browser engine');
    const resources: LoadedResource[] = [];
    const stylesheets: string[] = [];
    const pending: Promise<void>[] = [];
    page.on('response', (response) => {
      pending.push(
        response
          .body()
          .catch(() => Buffer.alloc(0)) // redirects have no body
          .then((body) => {
            if (response.request().resourceType() === 'stylesheet') {
              stylesheets.push(body.toString('utf8'));
            }
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
      const styles = [...document.querySelectorAll('style')].map((el) => el.textContent ?? '');
      return { script, styles };
    });
    const css = compressedSize([...stylesheets, ...inline.styles]);
    expect(
      checkPageWeight(resources, new URL(BASE_URL).origin, { script: inline.script }, css),
    ).toEqual([]);
  });
}

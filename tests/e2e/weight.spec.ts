import { expect, test } from '@playwright/test';
import { checkPageWeight, type LoadedResource } from '../support/page-weight.ts';
import { BASE_URL, builtPagePaths } from '../support/site.ts';

for (const path of builtPagePaths()) {
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
    await page.goto(path, { waitUntil: 'networkidle' });
    await Promise.all(pending);
    expect(checkPageWeight(resources, new URL(BASE_URL).origin)).toEqual([]);
  });
}

import { expect, test } from '@playwright/test';
import { EXPECTED_HEADERS } from '../support/headers.ts';
import { builtPagePaths, SERVER_ONLY } from '../support/site.ts';

// Every page in the sitemap. The 404 response is checked in site.spec.ts (Task 6).
for (const path of builtPagePaths()) {
  test(`${path} is served with every security header`, async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', SERVER_ONLY);
    const headers = (await request.get(path)).headers();
    for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
      expect(headers[name], name).toBe(value);
    }
  });
}

test('security.txt is served', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const response = await request.get('/.well-known/security.txt');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('Contact: mailto:');
});

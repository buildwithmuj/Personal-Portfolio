import { expect, test } from '@playwright/test';
import { checkLighthouse } from '../support/lighthouse-scores.ts';
import { runLighthouse } from '../support/lighthouse.ts';
import { BASE_URL, builtPagePaths } from '../support/site.ts';

// One Chrome at a time keeps the measurements stable.
test.describe.configure({ mode: 'serial' });

for (const path of builtPagePaths()) {
  test(`${path} meets the Lighthouse floors`, async () => {
    test.setTimeout(120_000);
    const report = await runLighthouse(new URL(path, BASE_URL).href);
    expect(checkLighthouse(report)).toEqual([]);
  });
}

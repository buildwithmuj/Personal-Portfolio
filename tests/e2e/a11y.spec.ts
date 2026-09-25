import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { builtPagePaths } from '../support/site.ts';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const paths = [...builtPagePaths(), '/does-not-exist'];

for (const path of paths) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} has no WCAG 2.2 AA violations in ${colorScheme} mode`, async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'axe results do not depend on the browser engine');
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

import { test as base } from '@playwright/test';
import { stubWeather } from './weather.ts';

/**
 * Playwright's `test`, with the live weather answered by a fixed reading for every page a test
 * opens (pop-ups included). Without it, each page asks Open-Meteo for London's weather: a full run
 * made thousands of requests, enough to use up the service's free daily allowance for this machine
 * (it then answers 429 to the tests, the dev server and the owner's own browser until the next day).
 * A test that needs another answer routes the page itself, which takes over from this.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await stubWeather(context);
    await use(context);
  },
});

export { expect, type Locator, type Page } from '@playwright/test';

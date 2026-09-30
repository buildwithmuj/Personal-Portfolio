import type { BrowserContext, Page } from '@playwright/test';

/**
 * Answers the top bar's live-weather request with a fixed reading, so no test depends on
 * Open-Meteo's speed or allowance from wherever it runs. Every browser test gets it for its whole
 * browser context (tests/support/test.ts).
 */
export async function stubWeather(target: Page | BrowserContext): Promise<void> {
  await target.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: { current: { temperature_2m: 18, weather_code: 1 } },
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
}

import type { Page } from '@playwright/test';

/**
 * Answers the top bar's live-weather request with a fixed reading, so tests that wait for the
 * network to go quiet never depend on Open-Meteo's speed from wherever they run.
 */
export async function stubWeather(page: Page): Promise<void> {
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: { current: { temperature_2m: 18, weather_code: 1 } },
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
}

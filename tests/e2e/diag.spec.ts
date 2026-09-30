import { expect, test } from '../support/test.ts';

// TEMPORARY diagnostic (to be deleted): in Firefox on CI, a click on the hero's Book a call now and
// then leaves the page short of Let's work together. This records what the page does after the
// click, several times over, and prints it to the CI log.
test('DIAG: Book a call scroll timeline in Firefox', async ({ page, browserName }) => {
  test.skip(browserName !== 'firefox' && !process.env['DIAG_ANY'], 'Firefox only');
  test.setTimeout(120_000);
  for (let run = 0; run < 10; run++) {
    await page.goto('/');
    await page.evaluate(() => {
      const w = window as unknown as { diag: unknown[] };
      w.diag = [];
      let scrolls = 0;
      const log = (event: string) =>
        w.diag.push([
          Math.round(performance.now()),
          event,
          Math.round(scrollY),
          location.hash,
          `${document.activeElement?.tagName}.${String(document.activeElement?.className).slice(0, 30)}`,
        ]);
      log('ready');
      addEventListener('scroll', () => {
        scrolls++;
        if (scrolls <= 3 || scrolls % 15 === 0) log(`scroll#${scrolls}`);
      });
      addEventListener('scrollend', () => log('scrollend'));
      addEventListener('hashchange', () => log('hashchange'));
      addEventListener('focusin', (event) =>
        log(`focusin ${(event.target as Element).tagName}.${(event.target as Element).className}`),
      );
      document.addEventListener(
        'click',
        (event) =>
          log(
            `click-capture ${(event.target as Element).tagName} ${(event.target as Element).getAttribute('href') ?? ''}`,
          ),
        true,
      );
      document.addEventListener('click', (event) =>
        log(`click-bubble dp=${event.defaultPrevented}`),
      );
      new MutationObserver((records) =>
        log(
          `mutation x${records.length} ${(records[0]?.target as Element)?.className ?? ''}`.slice(
            0,
            80,
          ),
        ),
      ).observe(document.querySelector('.top-bar') as Node, {
        subtree: true,
        attributes: true,
        childList: true,
      });
    });
    await page.locator('#top').getByRole('link', { name: 'Book a call' }).click();
    await page.waitForTimeout(3000);
    const result = await page.evaluate(() => ({
      y: Math.round(scrollY),
      max: document.documentElement.scrollHeight - innerHeight,
      contactTop: Math.round(document.getElementById('contact')?.getBoundingClientRect().top ?? -1),
      behavior: getComputedStyle(document.documentElement).scrollBehavior,
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      weather: performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.includes('open-meteo'))
        .map((entry) => Math.round(entry.startTime)),
      log: (window as unknown as { diag: unknown[] }).diag.slice(0, 40),
    }));
    console.log(`DIAG run ${run} ${JSON.stringify(result)}`);
  }
  expect(true).toBe(true);
});

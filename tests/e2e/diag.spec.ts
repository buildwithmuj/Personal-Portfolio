import { expect, test } from '../support/test.ts';
import { stubWeather } from '../support/weather.ts';

// TEMPORARY diagnostic (to be deleted). In Firefox on CI, pressing the hero's Book a call now and
// then scrolls the page as the link takes focus, so the click lands on another element and the
// page never reaches Let's work together. This loads the page fresh each time (a new context, as
// every test gets), half with the weather answered at once and half with it blocked, and logs the
// link's position and what scrolls, to find what makes Firefox scroll on focus.
test('DIAG: Book a call focus scroll in Firefox', async ({ browser, browserName }) => {
  test.skip(browserName !== 'firefox' && !process.env['DIAG_ANY'], 'Firefox only');
  test.setTimeout(240_000);
  for (let run = 0; run < 20; run++) {
    const weather = run % 2 === 0 ? 'answered' : 'blocked';
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      viewport: { width: 1280, height: 720 },
    });
    if (weather === 'answered') await stubWeather(context);
    else await context.route('https://api.open-meteo.com/**', (route) => route.abort());
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(() => {
      const w = window as unknown as { diag: unknown[] };
      w.diag = [];
      let scrolls = 0;
      const link = [...document.querySelectorAll<HTMLAnchorElement>('#top a')].find(
        (a) => a.textContent?.trim() === 'Book a call',
      );
      const box = () => {
        const r = link?.getBoundingClientRect();
        return r ? `${Math.round(r.top)}-${Math.round(r.bottom)}` : '?';
      };
      const log = (event: string) =>
        w.diag.push([Math.round(performance.now()), event, Math.round(scrollY), box()]);
      log(
        `ready vh=${innerHeight} sh=${document.documentElement.scrollHeight} fonts=${document.fonts.status} weather=${!document.querySelector<HTMLElement>('.top-bar .weather')?.hidden} anim=${document.getAnimations().filter((a) => a.playState === 'running').length}`,
      );
      addEventListener('scroll', () => {
        scrolls++;
        if (scrolls <= 2) log(`scroll#${scrolls}`);
      });
      addEventListener('scrollend', () => log('scrollend'));
      link?.addEventListener('mousedown', () =>
        log(
          `mousedown anims=${document
            .getAnimations()
            .filter((a) => a.playState === 'running')
            .map((a) => (a instanceof CSSAnimation ? a.animationName : 'x'))
            .join(',')}`,
        ),
      );
      link?.addEventListener('focus', () => log('focus'));
      document.addEventListener(
        'click',
        (event) => log(`click ${(event.target as Element).tagName}`),
        true,
      );
    });
    await page.locator('#top').getByRole('link', { name: 'Book a call' }).click();
    await page.waitForTimeout(2500);
    const result = await page.evaluate(() => ({
      y: Math.round(scrollY),
      hash: location.hash,
      log: (window as unknown as { diag: unknown[] }).diag,
    }));
    console.log(`DIAG2 run ${run} weather=${weather} ${JSON.stringify(result)}`);
    await context.close();
  }
  expect(true).toBe(true);
});

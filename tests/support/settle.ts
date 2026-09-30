import type { Locator } from '@playwright/test';

/**
 * Scrolls `target` into view and waits for the page around it to hold still before a test acts on
 * it. Cards and headings rise a few pixels as they come into view (400 ms, global.css); under a full
 * parallel run WebKit draws only six or seven frames a second, so Playwright could aim at an
 * element that then moved before the click or hover landed.
 *
 * Two waits, in order. First, for every reveal on screen to have begun: the page starts a reveal
 * from an observer, which under load can answer late, after a check for running animations has
 * already found none. Then, until no one-off animation or transition on the page's clock is running
 * (loops, and scroll-linked effects, never finish, so they don't count). Last, it checks the target
 * is still on screen, scrolling to it again if not.
 */
export async function scrollIntoViewSettled(target: Locator): Promise<void> {
  const page = target.page();
  for (let attempt = 0; attempt < 3; attempt++) {
    await target.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => {
        // The page's observer counts an element as arrived once it is in the window and above its
        // lowest 8% (Base.astro). Cards waiting off to the side, in a swipe deck, haven't arrived.
        const line = window.innerHeight * 0.92;
        const waiting = [...document.querySelectorAll('.reveal-ready [data-reveal]:not(.in)')].some(
          (element) => {
            const { top, bottom, left, right } = element.getBoundingClientRect();
            return bottom > 0 && top < line && right > 0 && left < window.innerWidth;
          },
        );
        return (
          !waiting &&
          document
            .getAnimations()
            .every(
              (animation) =>
                animation.playState !== 'running' ||
                animation.timeline !== document.timeline ||
                animation.effect?.getTiming().iterations === Infinity,
            )
        );
      },
      undefined,
      { polling: 'raf' },
    );
    const onScreen = await target.evaluate((element) => {
      const { top, bottom } = element.getBoundingClientRect();
      return bottom > 0 && top < window.innerHeight;
    });
    if (onScreen) return;
  }
}
